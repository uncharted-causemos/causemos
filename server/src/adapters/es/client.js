const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: `${process.env.TD_DATA_URL}` });

module.exports = { client };
