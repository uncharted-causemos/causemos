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
  for (let i = 0; i < body.items.length; i++) {
    if (i > num - 1) break;
    const item = body.items[0];
    const operation = Object.keys(item)[0];
    errors.push(JSON.stringify({
      status: item[operation].status,
      ...item[operation].error
    }));
  }
  return errors;
};

module.exports = { client, getBulkErrors };
