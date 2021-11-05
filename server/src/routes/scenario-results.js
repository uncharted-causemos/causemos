const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const scenarioService = rootRequire('/services/scenario-service');

router.get('/', asyncHandler(async (req, res) => {
  const engine = req.query.engine;
  const modelId = req.query.model_id;
  console.log('>>', modelId, engine);
  const r = await scenarioService.findResults(modelId, engine);
  res.json(r);
}));

router.post('/', asyncHandler(async (req, res) => {
  const {
    result,
    scenario_id,
    model_id,
    experiment_id,
    engine
  } = req.body;
  await scenarioService.createScenarioResult(model_id, scenario_id, engine, experiment_id, result);
  res.json({});
}));

module.exports = router;
