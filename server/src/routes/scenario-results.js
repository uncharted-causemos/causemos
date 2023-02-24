const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const scenarioService = rootRequire('/services/scenario-service');

/* Keycloak Authentication */
const keycloak = rootRequire('/config/keycloak-config.js').getKeycloak();
const { PERMISSIONS } = rootRequire('/util/auth-util.js');

router.get(
  '/',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const engine = req.query.engine;
    const modelId = req.query.model_id;
    const r = await scenarioService.findResults(modelId, engine);
    res.json(r);
  })
);

router.post(
  '/',
  keycloak.enforcer([PERMISSIONS.USER]),
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
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const engine = req.query.engine;
    const modelId = req.query.model_id;
    const r = await scenarioService.findSensitivityResults(modelId, engine);
    res.json(r);
  })
);

router.put(
  '/sensitivity',
  keycloak.enforcer([PERMISSIONS.USER]),
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
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const { id, experiment_id, result } = req.body;

    await scenarioService.updateSensitivityResult(id, experiment_id, result);
    res.json({});
  })
);

module.exports = router;
