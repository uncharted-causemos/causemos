const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = rootRequire('/services/external/maas-service');
const { respondUsingCode } = rootRequire('/util/model-run-util.ts');
const { getSelectedOutputTasks } = rootRequire('/util/query-param-util.js');

/* Keycloak Authentication */
// const authUtil = rootRequire('/util/auth-util.js');

/**
 * Submit a new model run to Jataware and store information about it in ES.
 */
router.post(
  '/',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, maasService.submitModelRun, [req.body]);
  })
);

/**
 * Return all model runs that match the specified filter
 */
router.get(
  '/',
  // authUtil.checkRole([authUtil.ROLES.USER]),
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
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, maasService.startModelOutputPostProcessing, [
      req.body,
      getSelectedOutputTasks(req.query),
    ]);
  })
);

/**
 * Inform of model execution failure
 */
router.post(
  '/:runId/run-failed',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, maasService.markModelRunFailed, [req.body]);
  })
);

/**
 * Get status of a submitted job
 */
router.get(
  '/:runId/status',
  // authUtil.checkRole([authUtil.ROLES.USER]),
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
  // authUtil.checkRole([authUtil.ROLES.USER]),
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
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const modelRun = req.body;
    const result = await maasService.updateModelRun(modelRun);
    res.json(result);
  })
);

module.exports = router;
