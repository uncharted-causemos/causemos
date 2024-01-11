const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = require('#@/services/external/maas-service.js');
const { respondUsingCode } = require('#@/util/model-run-util.js');
const { getSelectedOutputTasks } = require('#@/util/query-param-util.js');

/* Keycloak Authentication */
const authUtil = require('#@/util/auth-util.js');

/**
 * Submit a new model run to Jataware and store information about it in ES.
 */
router.post(
  '/',
  // This endpoint is accessed by Jataware using basic auth, so we don't check
  //  the user role here.
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
  authUtil.checkRole([authUtil.ROLES.USER]),
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
  // This endpoint is accessed by scripts and Jataware using basic auth, so we
  //  don't check the user role here.
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
  // This endpoint is accessed by scripts and Jataware using basic auth, so we
  //  don't check the user role here.
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
  authUtil.checkRole([authUtil.ROLES.USER]),
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
  authUtil.checkRole([authUtil.ROLES.USER]),
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
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const modelRun = req.body;
    const result = await maasService.updateModelRun(modelRun);
    res.json(result);
  })
);

module.exports = router;
