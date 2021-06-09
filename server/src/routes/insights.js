
const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const insightService = rootRequire('/services/insight-service');

/**
 * POST commit for an insight
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    name,
    description,
    // modified_at -> automatically added inside the function createInsight()
    visibility,
    project_id,
    model_id,
    url,
    target_view,
    pre_actions,
    post_actions,
    is_default,
    analytical_question,
    thumbnail,
    view_state,
    data_state
  } = req.body;
  const result = await insightService.createInsight(
    name,
    description,
    visibility,
    project_id,
    model_id,
    url,
    target_view,
    pre_actions,
    post_actions,
    is_default,
    analytical_question,
    thumbnail,
    view_state,
    data_state);
  res.json(result);
}));

/**
 * GET a list of insights
 */
router.get('/', asyncHandler(async (req, res) => {
  const { project_id, model_id, target_view, visibility } = req.query;
  const result = await insightService.getAllInsights(project_id, model_id, target_view, visibility);
  res.json(result);
}));

/**
 * GET a count of insights
 **/
router.get('/counts', asyncHandler(async (req, res) => {
  const { project_id: projectId } = req.query;
  const result = await insightService.counts(projectId);
  res.json(result);
}));

/**
 * GET an insight by id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const insightId = req.params.id;
  const result = await insightService.getInsight(insightId);
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
