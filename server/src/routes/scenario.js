const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const scenarioService = rootRequire('/services/scenario-service');

const DEFAULT_SCENARIO_SIZE = 50;

/**
 * GET Find scenarios
 */
router.get('/', asyncHandler(async (req, res) => {
  const modelId = req.query.model_id;
  const results = await scenarioService.find(modelId, { size: DEFAULT_SCENARIO_SIZE });
  res.json(results);
}));

/**
 * GET find scenario by scenario ID
 */
router.get('/:scenarioId', asyncHandler(async (req, res) => {
  const { scenarioId } = req.params;
  const result = await scenarioService.findOne(scenarioId);
  res.json(result);
}));

/**
 * POST create new scenario
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    parameter,
    name,
    description,
    model_id,
    is_baseline: isBaseline
  } = req.body;

  const r = await scenarioService.createScenario({
    parameter,
    name,
    description,
    model_id,
    isBaseline
  });
  res.json(r);
}));

/**
 * UPDATE scenario
 */
router.put('/:sId/', asyncHandler(async (req, res) => {
  const scenarioId = req.params.sId;
  const payload = req.body;
  // TODO: Add a payload validation here to not just allow any fields to be updated/added
  await scenarioService.update(scenarioId, payload);
  res.status(200).send({ updateToken: Date.now() });
}));

/**
 * DELETE scenario
 */
router.delete('/:sId/', asyncHandler(async (req, res) => {
  const scenarioId = req.params.sId;
  await scenarioService.remove(scenarioId);
  res.status(200).send({ updateToken: Date.now() });
}));


module.exports = router;
