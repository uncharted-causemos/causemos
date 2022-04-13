const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const datacubeService = rootRequire('/services/datacube-service');
const searchService = rootRequire('/services/search-service');
const filtersUtil = rootRequire('/util/filters-util');
const { respondUsingCode } = rootRequire('/util/model-run-util.ts');

/**
 * Insert a new model or indicator metadata doc
 */
router.post('/', asyncHandler(async (req, res) => {
  await respondUsingCode(res, datacubeService.insertDatacube, [req.body]);
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
 * Deprecate a model or indicator and add information about the new version
 */
router.put('/:datacubeId/deprecate', asyncHandler(async (req, res) => {
  const oldDatacubeId = req.params.datacubeId;
  const newVersionId = req.body.new_version_id;
  const result = await datacubeService.deprecateDatacubes(newVersionId, [oldDatacubeId]);
  res.json(result);
}));

/**
 * Get status of a submitted job
 */
router.get('/:indicatorId/status', asyncHandler(async (req, res) => {
  const indicatorId = req.params.indicatorId;
  const flowId = req.query.flow_id;

  try {
    const result = await datacubeService.getJobStatus(indicatorId, flowId);
    res.status(200).json(result || {});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
}));

/**
 * Get processing logs of a submitted job
 */
router.get('/:indicatorId/logs', asyncHandler(async (req, res) => {
  const indicatorId = req.params.indicatorId;
  const flowId = req.query.flow_id;

  try {
    const result = await datacubeService.getJobLogs(indicatorId, flowId);
    res.status(200).json(result || {});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
}));

/**
 * POST Bulk update multiple indicators
 *
 * NOTE: THIS WILL NOT SEND CHANGES TO DOJO
 */
router.post('/bulk-update-indicator', asyncHandler(async (req, res) => {
  const deltas = req.body.deltas;
  const result = await datacubeService.updateDatacubes(deltas, false);
  res.json(result);
}));

/**
 * POST Bulk update multiple datacubes
 */
router.post('/add-sparklines', asyncHandler(async (req, res) => {
  const datacubes = req.body.datacubes;
  const result = await datacubeService.generateSparklines(datacubes);
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
  const field = req.query.field;
  const queryString = req.query.q;
  const results = await datacubeService.searchFields(field, queryString);
  res.json(results);
}));

/**
 * GET Search for data cubes based on query string
 */
router.get('/datacube-suggestions', asyncHandler(async (req, res) => {
  const q = req.query.q;
  const result = await searchService.rawDatacubeSearch(q);
  res.json(result);
}));

/**
 * GET Search for data cubes based on query string
 */
router.get('/datasets', asyncHandler(async (req, res) => {
  const type = req.query.type || 'indicator';
  const limit = req.query.limit || 0;
  const result = await datacubeService.getDatasets(type, limit);
  res.json(result);
}));

module.exports = router;
