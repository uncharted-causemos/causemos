const _ = require('lodash');
const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: `${process.env.TD_DATA_URL}` });

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
 * @param {string} queryString
 * @param {array} filters - additional filter criteria
 * @param {array} fields - fields to highlight
 */
const searchAndHighlight = async (index, queryString, filters = [], fields = []) => {
  const fieldsToHighlight = {};
  fields.forEach(f => {
    fieldsToHighlight[f] = {};
  });
  let query = {};
  if (_.isEmpty(filters)) {
    query = {
      query_string: {
        query: queryString
      }
    };
  } else {
    query = {
      bool: {
        must: [
          ...filters,
          {
            query_string: {
              query: queryString
            }
          }
        ]
      }
    };
  }
  const matches = await client.search({
    index: index,
    body: {
      query,
      highlight: {
        fields: fieldsToHighlight,
        pre_tags: '<m>',
        post_tags: '</m>'
      }
    }
  });
  return matches.body.hits.hits;
};


module.exports = { client, getBulkErrors, searchAndHighlight };
