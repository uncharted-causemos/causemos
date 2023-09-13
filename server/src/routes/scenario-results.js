const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const scenarioService = require('#@/services/scenario-service.js');

/* Keycloak Authentication */
const authUtil = require('#@/util/auth-util.js');

router.get(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const engine = req.query.engine;
    const modelId = req.query.model_id;
    const r = await scenarioService.findResults(modelId, engine);
    res.json(r);
  })
);

router.post(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const { result, scenario_id, model_id, experiment_id, engine } = req.body;
    await scenarioService.createScenarioResult(
      model_id,
      scenario_id,
      engine,
      experiment_id,
      result
    );
    res.json({});
  })
);

router.get(
  '/sensitivity',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const engine = req.query.engine;
    const modelId = req.query.model_id;
    const r = await scenarioService.findSensitivityResults(modelId, engine);
    res.json(r);
  })
);

router.put(
  '/sensitivity',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const { result, scenario_id, model_id, experiment_id, engine } = req.body;
    await scenarioService.createSensitivityResult(
      model_id,
      scenario_id,
      engine,
      experiment_id,
      result
    );
    res.json({});
  })
);

router.post(
  '/sensitivity',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const { id, experiment_id, result } = req.body;

    await scenarioService.updateSensitivityResult(id, experiment_id, result);
    res.json({});
  })
);

module.exports = router;
