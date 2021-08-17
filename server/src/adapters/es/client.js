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

module.exports = { client, getBulkErrors };
