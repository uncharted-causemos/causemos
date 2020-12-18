const express = require('express');
const asyncHandler = require('express-async-handler');
const _ = require('lodash');
const moment = require('moment');
const router = express.Router();

const scenarioService = rootRequire('/services/scenario-service');

const DEFAULT_SCENARIO_SIZE = 50;
/**
 * GET Find scenarios
 */
router.get('/', asyncHandler(async (req, res) => {
  const engine = req.query.engine;
  const modelId = req.query.model_id;
  const results = await scenarioService.find(modelId, engine, { size: DEFAULT_SCENARIO_SIZE });
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
    result,
    parameter,
    name,
    description,
    engine,
    experimentId,
    modelId,
    is_baseline: isBaseline
  } = req.body;

  if (_.isNil(engine)) {
    throw new Error('Engine cannot be empty');
  }

  const experiment = await scenarioService.create({
    result,
    parameter,
    name,
    description,
    modelId,
    engine,
    experimentId,
    isBaseline
  });
  res.json(experiment);
}));

/**
 * UPDATE scenario
 */
router.put('/:sId/', asyncHandler(async (req, res) => {
  const scenarioId = req.params.sId;
  const payload = req.body;
  // TODO: Add a payload validation here to not just allow any fields to be updated/added
  await scenarioService.update(scenarioId, payload);
  res.status(200).send({ updateToken: moment.utc().valueOf() });
}));

/**
 * DELETE scenario
 */
router.delete('/:sId/', asyncHandler(async (req, res) => {
  const scenarioId = req.params.sId;
  await scenarioService.remove(scenarioId);
  res.status(200).send({ updateToken: moment.utc().valueOf() });
}));

module.exports = router;
