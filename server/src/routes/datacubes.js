const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const datacubeService = rootRequire('/services/datacube-service');
const filtersUtil = rootRequire('/util/filters-util');

/**
 * Insert a new model or indicator metadata doc
 */
router.post('/', asyncHandler(async (req, res) => {
  // TODO
  res.status(200).json({ FIXME: true });
}));

/**
 * Return all datacubes (models and indicators) that match the provided filter.
 */
router.get('/', asyncHandler(async (req, res) => {
  const filters = filtersUtil.parse(req.query.filters);
  const result = await datacubeService.getDatacubes(filters);
  res.json(result);
}));

/**
 * Return the number of datacubes that match the provided filter
 */
router.get('/count', asyncHandler(async (req, res) => {
  const filters = filtersUtil.parse(req.query.filters);
  const result = await datacubeService.countDatacubes(filters);
  res.json(result);
}));

/**
 * GET facet aggregations
 */
router.get('/facets', asyncHandler(async (req, res) => {
  let facetList = [];
  if (typeof req.query.facets === 'string') {
    facetList = JSON.parse(req.query.facets);
  }
  const filters = filtersUtil.parse(req.query.filters);

  const facetsResult = await datacubeService.facets(filters, facetList);
  res.json(facetsResult);
}));


/**
 * GET Search fields based on partial matches
 **/
router.get('/suggestions', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const field = req.query.field;
  const queryString = req.query.q;
  const results = await datacubeService.searchFields(projectId, field, queryString);
  res.json(results);
}));

module.exports = router;
