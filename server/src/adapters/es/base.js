const _ = require('lodash');
const ES = require('./client');
const Logger = rootRequire('/config/logger');

/**
 * Translate to ES term query
 *
 * @param {array} simpleFilters - [{field, value}, {field, value} ...]
 */
const parseSimpleFilters = (simpleFilters) => {
  const boolFilters = [];

  if (_.isEmpty(simpleFilters)) {
    return {
      query: {
        match_all: {},
      },
    };
  }

  simpleFilters.forEach((clause) => {
    if (_.isArray(clause.value)) {
      boolFilters.push({
        terms: {
          [clause.field]: clause.value,
        },
      });
    } else {
      boolFilters.push({
        term: {
          [clause.field]: clause.value,
        },
      });
    }
  });
  return {
    query: {
      bool: {
        filter: boolFilters,
      },
    },
  };
};

/**
 * Used to wrap resources that use simple search mechanics
 */
class Base {
  constructor(index) {
    if (_.isNil(index) || _.isEmpty(index)) {
      throw new Error('Index is empty or undefined');
    }
    this.index = index;
    this.client = ES.client;
  }

  /**
   * Find one
   * @param {array} simpleFilters - Basic filters to look up by fields
   * @param {object} options - see buildSearch
   */
  async findOne(simpleFilters, options) {
    options.size = 1; // Force size 1
    const result = await this._search(simpleFilters, options);
    if (_.isEmpty(result.hits.hits)) return null;
    return result.hits.hits[0]._source;
  }

  /**
   * Find many
   * @param {array} simpleFilters - Basic filters to look up by fields
   * @param {object} options - see buildSearch
   */
  async find(simpleFilters, options) {
    const result = await this._search(simpleFilters, options);
    return result.hits.hits.map((d) => d._source);
  }

  /**
   * Whether the filters yield results
   * @param {array} simpleFilters - Basic filters to look up by fields
   */
  async exists(simpleFilters) {
    const options = { size: 0 }; // Force no hits
    const result = await this._search(simpleFilters, options);
    return result.hits.total.value > 0;
  }

  /**
   * Count
   * @param {array} simpleFilters - Basic filters to look up by fields
   */
  async count(simpleFilters) {
    const countQuery = {
      index: this.index,
      body: parseSimpleFilters(simpleFilters),
    };
    const result = await this.client.count(countQuery);
    return result.body.count;
  }

  /**
   * Remove by filter
   * @param {array} simpleFilters - Basic filters to look up by fields
   */
  async remove(simpleFilters) {
    try {
      const response = await this.client.deleteByQuery({
        index: this.index,
        refresh: 'true',
        body: parseSimpleFilters(simpleFilters),
      });
      return response.body;
    } catch (err) {
      Logger.error(JSON.stringify(err));
      return null;
    }
  }

  /**
   * Remove by terms
   * @param {object} simpleTerms - Basic terms to look up by fields
   */
  async removeMany(simpleTerms) {
    try {
      const response = await this.client.deleteByQuery({
        index: this.index,
        refresh: 'true',
        body: {
          query: {
            bool: {
              must: {
                terms: simpleTerms,
              },
            },
          },
        },
      });
      return response.body;
    } catch (err) {
      Logger.error(JSON.stringify(err));
      return null;
    }
  }

  /**
   * Insert a single doc or many docs. Note technically this also
   * updates via delete-then-reindex..
   *
   * @param {array|object} payload - Object(s) to insert
   * @param {function} keyFn - should return the es-doc identifier
   * @param {string} refreshOption - one of 'true', 'false', 'wait_for'
   */
  async insert(payload, keyFn, refreshOption = 'true') {
    let p = payload;
    if (!_.isArray(payload)) {
      p = [payload];
    }

    const bulk = [];
    p.forEach((d) => {
      bulk.push({ index: { _index: this.index, _id: keyFn(d) } });
      bulk.push(d);
    });

    const result = await this._bulk(bulk, refreshOption);
    return result;
  }

  /**
   * Update a single doc or many docs
   * @param {array|object} payload - Object(s) to update
   * @param {function} keyFn - should return the es-doc identifier
   * @param {string} refreshOption - one of 'true', 'false', 'wait_for'
   * @param {number} numRetries - how many times to retry after conflict
   */
  async update(payload, keyFn, refreshOption = 'true', numRetries = 0) {
    let p = payload;
    if (!_.isArray(payload)) {
      p = [payload];
    }

    const bulk = [];
    p.forEach((d) => {
      bulk.push({ update: { _index: this.index, _id: keyFn(d), retry_on_conflict: numRetries } });
      bulk.push({ doc: d }); // Allow partial
    });

    const result = await this._bulk(bulk, refreshOption);
    return result;
  }

  /**
   * Update docs using a script
   * @param {array} simpleFilters - Basic filters to look up by fields
   * @param {object} script - The script to execute on each matched document
   * @param {boolean} refreshOption - Refresh all shards after operation
   */
  async updateByQuery(simpleFilters, script, refreshOption = true) {
    const payload = {
      index: this.index,
      refresh: refreshOption,
      body: {
        ...parseSimpleFilters(simpleFilters), // query
        script: script,
      },
    };

    try {
      const response = await this.client.updateByQuery(payload);
      return response.body;
    } catch (err) {
      Logger.error(JSON.stringify(err));
      return null;
    }
  }

  /**
   * Bulk API for sending bulk create/delete/index/update operations
   *
   * @param {array<object>} requestBody - list of objects representing the bulk operations
   * @param {string} refreshOption - one of 'true', 'false', 'wait_for'
   */
  async _bulk(requestBody, refreshOption) {
    try {
      const response = await this.client.bulk({
        refresh: refreshOption,
        body: requestBody,
      });
      const body = response.body;
      if (body.errors) {
        const errors = ES.getBulkErrors(body);
        errors.forEach(Logger.error);
      }
      return body;
    } catch (err) {
      Logger.error(JSON.stringify(err));
      return null;
    }
  }

  /**
   * @param {array} simpleFilters - Basic filters to look up by fields
   * @param {object} options
   * @param {number} options.size - number of results to return
   * @param {number} options.from - pagination start
   * @param {array} options.sort - {field: order} object, eg [{field1: 'asc'}, {field2: 'desc'}]
   * @param {array} options.includes - array of fields to include
   */
  async _search(simpleFilters, options) {
    const searchPayload = {
      index: this.index,
      body: parseSimpleFilters(simpleFilters),
    };
    if (!_.isNil(options.size)) searchPayload.size = +options.size;
    if (!_.isNil(options.from)) searchPayload.from = +options.from;
    if (options.sort) searchPayload.body.sort = options.sort;
    if (options.includes) {
      searchPayload.body._source = {
        includes: options.includes,
      };
    } else if (options.excludes) {
      searchPayload.body._source = {
        excludes: options.excludes,
      };
    }
    if (options.version) {
      searchPayload.body.version = options.version;
    }

    const response = await this.client.search(searchPayload);
    if (options.version) {
      response.body.hits.hits.forEach((hit) => {
        hit._source._version = hit._version;
      });
    }
    return response.body;
  }

  /**
   * Returns distribution by fieldName
   *
   * @param {string} fieldName
   * @param {object} optional, simpleFilters
   */
  async getFacets(fieldName, simpleFilters = null) {
    const query = simpleFilters ? parseSimpleFilters(simpleFilters).query : { match_all: {} };
    const response = await this.client.search({
      index: this.index,
      body: {
        size: 0,
        query: query,
        aggs: {
          [fieldName]: {
            terms: {
              field: fieldName,
              size: 10000,
            },
          },
        },
      },
    });

    const counts = response.body.aggregations[fieldName].buckets;
    return counts;
  }
}

module.exports = { Base };
