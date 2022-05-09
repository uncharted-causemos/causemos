
const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const insightService = rootRequire('/services/insight-service');

/**
 * POST commit for an insight
 */
router.post('/', asyncHandler(async (req, res) => {
  // FIXME: add support for analysisId field
  const {
    name,
    description,
    // modified_at -> automatically added inside the function createInsight()
    visibility,
    project_id,
    context_id,
    url,
    target_view,
    pre_actions,
    post_actions,
    is_default,
    analytical_question,
    image,
    view_state,
    data_state,
    annotation_state
  } = req.body;
  const result = await insightService.createInsight(
    name,
    description,
    visibility,
    project_id,
    context_id,
    url,
    target_view,
    pre_actions,
    post_actions,
    is_default,
    analytical_question,
    image,
    view_state,
    data_state,
    annotation_state);
  res.json(result);
}));

/**
 * Update an insight doc
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const insightId = req.params.id;
  const insight = req.body;
  insight.id = insight.id || insightId;
  await insightService.updateInsight(insightId, insight);
  res.status(200).send({ updated: 'success' });
}));

/**
 * GET a list of insights
 */
router.get('/', asyncHandler(async (req, res) => {
  const filterParams = JSON.parse(req.query.filters);
  const options = JSON.parse(req.query.options) || {};
  const result = await insightService.getAllInsights(filterParams, options);
  res.json(result);
}));
// POST version
router.post('/search', asyncHandler(async (req, res) => {
  const filterParams = req.body.filters;
  const options = req.body.options || {};
  const result = await insightService.getAllInsights(filterParams, options);
  res.json(result);
}));

/**
 * GET a count of insights
 **/
router.get('/count', asyncHandler(async (req, res) => {
  const filterParams = JSON.parse(req.query.filters);
  const result = await insightService.count(filterParams);
  res.json(result);
}));

/**
 * GET an insight by id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const insightId = req.params.id;
  const allowList = req.params.allowList;
  const result = await insightService.getInsight(insightId, allowList);
  res.status(200);
  res.json(result);
}));

/**
 * DELETE existing insight
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const insightId = req.params.id;
  const result = await insightService.remove(insightId);
  res.status(200);
  res.json(result);
}));

module.exports = router;
