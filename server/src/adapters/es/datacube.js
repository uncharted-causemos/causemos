const _ = require('lodash');

const ES = require('./client');
const queryUtil = require('./datacube-query-util');
const { rangeAggregation, termsAggregation, dateRangeAggregation } = require('./datacube-agg-util');
const { FIELDS, FIELD_TYPES, FIELD_LEVELS, NESTED_FIELD_PATHS } = require('./datacube-config');
const { RESOURCE } = require('./adapter');
const Logger = rootRequire('/config/logger');

const MAX_ES_SUGGESTION_BUCKET_SIZE = 20;

const _facetQuery = (filters, fields = []) => {
  const filterQuery = queryUtil.buildQuery(filters);
  const aggregations = {};
  fields.forEach(field => {
    const fieldMeta = FIELDS[field];
    if (fieldMeta.type === FIELD_TYPES.NORMAL) {
      aggregations[field] = termsAggregation(field);
    } else if (fieldMeta.type === FIELD_TYPES.RANGED) {
      aggregations[field] = rangeAggregation(field);
    } else if (fieldMeta.type === FIELD_TYPES.DATE) {
      // FIXME: reimplement date range aggregation after figuring out how dates should be faceted in the Front end - June 16th 2020
      aggregations[field] = dateRangeAggregation(field);
    } else {
      throw new Error(`Unsupported aggregation for field ${field}`);
    }
  });
  const result = {
    size: 0,
    query: filterQuery.query,
    aggs: aggregations
  };
  return result;
};

const _facetPostProcess = (fields, facets) => {
  const result = {};
  fields.forEach(field => {
    const fieldMeta = FIELDS[field];
    if (fieldMeta.type === FIELD_TYPES.DATE) {
      // handle custom result from date histogram aggregation
      const dateHistogramData = facets[field].buckets;
      const dateKeys = Object.keys(dateHistogramData);
      result[field] = dateKeys.map(key => {
        return {
          key: key,
          value: dateHistogramData[key].doc_count
        };
      });
    } else {
      result[field] = facets[field].buckets.map(bucket => {
        return {
          key: bucket.key,
          value: bucket.doc_count
        };
      });
    }
  });

  return result;
};

/**
 * Return datacube id
 * @param {object} doc - object to insert/update to Elasticsearch
 */

const _keyFn = (doc) => {
  return doc.id;
};

class Datacube {
  constructor (index) {
    this.index = index;
    this.client = ES.client;
  }

  async findOne (filters, options) {
    options.size = 1; // return only one

    const result = await this._search(filters, options);
    if (_.isEmpty(result.hits.hits)) return null;
    return result.hits.hits[0]._source;
  }

  async find (filters, options) {
    const result = await this._search(filters, options);
    if (_.isEmpty(result.hits.hits)) return [];
    return result.hits.hits.map(d => d._source);
  }

  /**
   * Count dtacubes
   * @param {object} filters - datacube related filters
   */
  async count (filters) {
    const filterQuery = queryUtil.buildQuery(filters);
    const countQuery = {
      index: this.index,
      body: filterQuery
    };
    const result = await this.client.count(countQuery);
    return result.body.count;
  }


  /**
   * Returns datacube facets
   *
   * @param {object} filters
   * @param {array} fieldNames - array of config fields
   */
  async getFacets(filters, fieldNames) {
    // Sanity check, remove invalid fields
    const filteredFieldNames = [];
    fieldNames.forEach(f => {
      if (FIELDS[f] && FIELDS[f].level === FIELD_LEVELS.DATACUBE) {
        filteredFieldNames.push(f);
      }
    });
    if (_.isEmpty(filteredFieldNames)) {
      return {};
    }

    // Query
    const query = _facetQuery(filters, filteredFieldNames);
    const response = await this.client.search({
      index: this.index,
      body: query
    });
    const facets = response.body.aggregations;

    if (_.isEmpty(facets)) return {};
    const result = _facetPostProcess(filteredFieldNames, facets);

    return result;
  }

  /**
   * Search various fields in ES for terms starting with the queryString
   *
   * @param {string} searchField - config fields
   * @param {string} queryString - search query
   */
  async searchFields(searchField, queryString) {
    const fieldNames = FIELDS[searchField].fields;

    // Add wildcard so that we do a prefix search
    const processedQuery = decodeURI(queryString)
      // .toLowerCase() TODO: case insensitive search works for concepts but not author
      .split(' ')
      .filter(el => el !== '')
      .map(el => `${el}*`)
      .join(' ');

    const searchBodies = [];
    fieldNames.forEach(field => {
      searchBodies.push({ index: RESOURCE.DATA_DATACUBE });
      searchBodies.push({
        size: 0,
        aggs: this._createNestedQuery(field, {
          filtered: {
            filter: {
              query_string: {
                fields: [field],
                query: processedQuery,
                default_operator: 'AND'
              }
            },
            aggs: {
              fieldAgg: {
                terms: {
                  field: field,
                  size: MAX_ES_SUGGESTION_BUCKET_SIZE
                }
              }
            }
          }
        })
      });
    });
    const { body } = await this.client.msearch({
      body: searchBodies
    });

    const allResults = body.responses.reduce((acc, resp) => {
      const aggs = resp.aggregations.nestedAgg || resp.aggregations;
      return acc.concat(aggs.filtered.fieldAgg.buckets);
    }, []);

    // Combine duplicate results by adding doc_count and sort in descending order
    const matchedTerms = _(allResults)
      .groupBy('key')
      .map(items => {
        return {
          key: items[0].key,
          count: items.reduce((acc, item) => acc + item.doc_count, 0)
        };
      })
      .sort((a, b) => b.count - a.count)
      .map(item => item.key)
      .value();

    return matchedTerms;
  }

  /**
   * Checks if the field is a nested type, and if so creates a nested EQ query from the one provided.
   * @param {string} field - the field being searched in the query
   * @param {object} query - the ES query
   * @returns {{nestedAgg: {nested: {path: {string}}, aggs: {object}}}|{object}} a nested ES query if needed, or the original query if the field isn't nested.
   * @private
   */
  _createNestedQuery(field, query) {
    const nestedPath = _.find(Object.values(NESTED_FIELD_PATHS), path => field.startsWith(path));
    if (nestedPath) {
      return {
        nestedAgg: {
          nested: {
            path: nestedPath
          },
          aggs: query
        }
      };
    }

    return query;
  }

  /**
   * Insert a list of datacubes
   * @param {array} payloadArray
   * @param {string} refreshOption - one of 'true', 'false', 'wait_for'
   */
  async insert(payloadArray, refreshOption = 'true') {
    const result = await this._bulk('index', payloadArray, refreshOption);
    return result;
  }

  /**
   * Update a list of datacubes keyed by id
   * @param {array} payloadArray
   * @param {string} refreshOption - one of 'true', 'false', 'wait_for'
   */
  async update(payloadArray, refreshOption = 'true') {
    const result = await this._bulk('update', payloadArray, refreshOption);
    return result;
  }

  async _search(filters, options) {
    const filterQuery = queryUtil.buildQuery(filters);
    const searchPayload = {
      index: this.index,
      body: filterQuery
    };
    searchPayload.size = !_.isNil(options.size) ? +options.size : 50;
    searchPayload.from = !_.isNil(options.from) ? +options.from : 0;

    if (!_.isEmpty(options.sort)) {
      const sort = {};
      Object.keys(options.sort).forEach(key => {
        const esField = FIELDS[key].fields[0];
        sort[esField] = options.sort[key];
      });
      searchPayload.body.sort = sort;
    }
    if (options.excludes) {
      searchPayload.body._source = {
        excludes: options.excludes
      };
    } else if (options.includes) {
      searchPayload.body._source = {
        includes: options.includes
      };
    }
    const response = await this.client.search(searchPayload);
    return response.body;
  }


  /**
   * Bulk ES operation
   * @param {string} operationType - update|index
   * @param {array} payloadArray - array of documents or partials
   * @param {string} refreshOption - one of 'true', 'false', 'wait_for'
   */
  async _bulk(operationType, payloadArray, refreshOption) {
    const bulk = [];
    payloadArray.forEach(doc => {
      bulk.push({ [operationType]: { _index: this.index, _id: _keyFn(doc) } });
      if (operationType === 'update') {
        bulk.push({ doc: doc });
      } else {
        bulk.push(doc);
      }
    });

    try {
      const response = await this.client.bulk({
        refresh: refreshOption,
        body: bulk
      });
      return response.body;
    } catch (err) {
      Logger.error(err);
      return null;
    }
  }
}

module.exports = { Datacube };
