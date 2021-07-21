const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const datacubeService = rootRequire('/services/datacube-service');
const filtersUtil = rootRequire('/util/filters-util');

/**
 * Insert a new model or indicator metadata doc
 */
router.post('/', asyncHandler(async (req, res) => {
  const metadata = req.body;
  const result = await datacubeService.insertDatacube(metadata);
  res.json(result);
}));

/**
 * Update a model or indicator metadata doc
 */
router.put('/:datacubeId', asyncHandler(async (req, res) => {
  const datacubeId = req.params.datacubeId;
  const metadata = req.body;
  metadata.id = metadata.id || datacubeId;
  const result = await datacubeService.updateDatacube(metadata);
  res.json(result);
}));

/**
 * Return all datacubes (models and indicators) that match the provided filter.
 */
router.get('/', asyncHandler(async (req, res) => {
  const filters = filtersUtil.parse(req.query.filters);
  const options = JSON.parse(req.query.options) || {};
  const result = await datacubeService.getDatacubes(filters, options);
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
