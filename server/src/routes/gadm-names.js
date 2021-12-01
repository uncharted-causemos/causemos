const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const { RESOURCE } = rootRequire('adapters/es/adapter');
const { searchAndHighlight, queryStringBuilder } = rootRequire('adapters/es/client');

/**
 * GET Search fields based on partial matches
 **/
router.get('/suggestions', asyncHandler(async (req, res) => {
  const field = req.query.field;
  const unmodifiedQueryString = req.query.q;

  // If field is provided, limit search to that specific level
  const filters = [];
  if (field) {
    filters.push({ term: { level: field } });
  }

  const builder = queryStringBuilder().setOperator('AND');
  unmodifiedQueryString
    .split(' ')
    .filter(el => el !== '')
    .forEach(v => builder.addWildCard(v));

  const results = await searchAndHighlight(
    RESOURCE.GADM_NAME, builder.build(), filters, ['country', 'admin1', 'admin2', 'admin3']);
  res.json(results.map(result => result._source));
}));

module.exports = router;
