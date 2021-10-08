const _ = require('lodash');

const ES = require('./client');
const { FIELDS } = require('./gadm-config');

const MAX_ES_SUGGESTION_BUCKET_SIZE = 20;

class Gadm {
  constructor (index) {
    this.index = index;
    this.client = ES.client;
  }

  /**
   * Search various fields in ES for terms starting with the queryString
   *
   * @param {string} searchField - config fields
   * @param {string} queryString - search query
   */
  async searchFields(searchField, queryString) {
    const fieldNames = FIELDS[searchField].fields;
    const aggFieldNames = FIELDS[searchField].aggFields || fieldNames;

    // Add wildcard so that we do a prefix search
    const processedQuery = decodeURI(queryString)
      // .toLowerCase() TODO: case insensitive search works for concepts but not author
      .split(' ')
      .filter(el => el !== '')
      .map(el => `${el}*`)
      .join(' ');

    const searchBodies = [];
    fieldNames.forEach((field, idx) => {
      searchBodies.push({ index: 'gadm-name' });
      // ^^ from adapter.js RESOURCE.DATA_DATACUBE
      // can't use it directly because that would be circular dependency, yay!
      searchBodies.push({
        size: 0,
        aggs: {
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
                  field: aggFieldNames[idx],
                  size: MAX_ES_SUGGESTION_BUCKET_SIZE
                }
              }
            }
          }
        }
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
}

module.exports = { Gadm };
