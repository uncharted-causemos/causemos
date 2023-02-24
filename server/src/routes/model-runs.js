const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = rootRequire('/services/external/maas-service');
const { respondUsingCode } = rootRequire('/util/model-run-util.ts');

/* Keycloak Authentication */
const keycloak = rootRequire('/config/keycloak-config.js').getKeycloak();
const { PERMISSIONS } = rootRequire('/util/auth-util.js');

/**
 * Submit a new model run to Jataware and store information about it in ES.
 */
router.post(
  '/',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, maasService.submitModelRun, [req.body]);
  })
);

/**
 * Return all model runs that match the specified filter
 */
router.get(
  '/',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const filter = JSON.parse(req.query.filter);
    const result = await maasService.getAllModelRuns(filter, true);
    res.status(200).json(result);
  })
);

/**
 * Start a model data post processing job
 */
router.post(
  '/:runId/post-process',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, maasService.startModelOutputPostProcessing, [req.body]);
  })
);

/**
 * Inform of model execution failure
 */
router.post(
  '/:runId/run-failed',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, maasService.markModelRunFailed, [req.body]);
  })
);

/**
 * Get status of a submitted job
 */
router.get(
  '/:runId/status',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const runId = req.params.runId;
    const flowId = req.query.flow_id;

    try {
      const result = await maasService.getJobStatus(runId, flowId);
      res.status(200).json(result || {});
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal request returned: ' + err.message);
    }
  })
);

/**
 * Get processing logs of a submitted job
 */
router.get(
  '/:runId/logs',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const runId = req.params.runId;
    const flowId = req.query.flow_id;

    try {
      const result = await maasService.getJobLogs(runId, flowId);
      res.status(200).json(result || {});
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal request returned: ' + err.message);
    }
  })
);

/**
 * Update a model run
 */
router.put(
  '/:modelRunId',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const modelRun = req.body;
    const result = await maasService.updateModelRun(modelRun);
    res.json(result);
  })
);

module.exports = router;
