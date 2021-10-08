const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const gadmService = rootRequire('/services/gadm-service');

/**
 * GET Search fields based on partial matches
 **/
router.get('/suggestions', asyncHandler(async (req, res) => {
  const field = req.query.field;
  const queryString = req.query.q;
  const results = await gadmService.searchFields(field, queryString);
  res.json(results);
}));

module.exports = router;
