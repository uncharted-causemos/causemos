const _ = require('lodash');
const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: `${process.env.TD_DATA_URL}` });

class QueryStringBuilder {
  constructor() {
    this.operator = 'OR';
    this.searches = [];
  }

  setOperator(v) {
    this.operator = v;
    return this;
  }

  setFields(v) {
    this.fields = v;
    return this;
  }

  addWildCard(v) {
    this.searches.push(`${v}*`);
    return this;
  }

  addFuzzy(v, dist = 1) {
    this.searches.push(`${v}~${dist}`);
    return this;
  }

  // addFuzzyPhrase(v) {
  //   const str = v.split(' ').join('~1 ');
  //   this.searches.push(`"${str}"`);
  // }

  add(str) {
    this.searches.push(`${str}`);
    return this;
  }

  build() {
    const r = {
      query_string: {
        query: this.searches.join(` ${this.operator} `)
      }
    };
    if (!_.isEmpty(this.fields)) {
      r.query_string.fields = this.fields;
    }
    return r;
  }
}

const queryStringBuilder = () => {
  return new QueryStringBuilder();
};

/**
 * Utility method to handle ES-bulk operation errors
 * Returns the first num errors found in response body
 *
 * @param {object} body - ES bulk response object
 * @param {number} num - Return first num errors
 */
const getBulkErrors = (body, num = 2) => {
  const errors = [];
  let counter = 0;
  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    const operation = Object.keys(item)[0];
    if (item[operation].error) {
      errors.push(JSON.stringify({
        status: item[operation].status,
        ...item[operation].error
      }));
      counter++;
      if (counter >= num) break;
    }
  }
  return errors;
};



/**
 * Returns elasticsearch highlights with the search results.
 * Highlights only works for fields that are specified.
 *
 * Completes a query_string search, with any provided filters
 *
 * Filters must be in the form of a list of objects, containing simple filters, e.g term filters
 *
 * @param {string} index - index to search
 * @param {object} queryStringObject
 * @param {array} filters - additional filter criteria
 * @param {array} fields - optional, fields to highlight
 */
const searchAndHighlight = async (index, queryStringObject, filters, fields) => {
  const query = _.isEmpty(filters)
    ? queryStringObject
    : {
      bool: {
        must: [
          ...filters,
          queryStringObject
        ]
      }
    };

  const searchBody = { query };
  if (!_.isEmpty(fields)) {
    const fieldsToHighlight = {};
    fields.forEach(f => {
      fieldsToHighlight[f] = {};
    });
    searchBody.highlight = { fields: fieldsToHighlight };
  }

  const matches = await client.search({
    index: index,
    body: searchBody
  });
  return matches.body.hits.hits;
};


module.exports = { client, getBulkErrors, searchAndHighlight, queryStringBuilder };
