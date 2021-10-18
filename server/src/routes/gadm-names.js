const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const { RESOURCE } = rootRequire('adapters/es/adapter');
const { searchAndHighlight } = rootRequire('adapters/es/client');

/**
 * GET Search fields based on partial matches
 **/
router.get('/suggestions', asyncHandler(async (req, res) => {
  const field = req.query.field;
  const unmodifiedQueryString = req.query.q;
  const filters = [
    {
      term: {
        level: field
      }
    }
  ];
  const queryString = unmodifiedQueryString.split(' ').filter(el => el !== '').map(el => `${el}*`).join(' ');
  const results = await searchAndHighlight(RESOURCE.GADM_NAME, queryString, filters, [field]);
  res.json(results.map(result => result._source));
}));

module.exports = router;
