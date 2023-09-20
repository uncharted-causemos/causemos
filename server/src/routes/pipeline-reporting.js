const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const pipelineReportingService = require('#@/services/pipeline-reporting-service.js');
const { respondUsingCode } = require('#@/util/model-run-util.js');

/* Keycloak Authentication */
const authUtil = require('#@/util/auth-util.js');

/**
 * Sets the status of the relevant ES documents to `PROCESSING FAILED`.
 */
router.put(
  '/processing-failed',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, pipelineReportingService.setProcessingFailed, [req.body]);
  })
);

/**
 * Updates the relevant ES documents with results from the pipeline and marks them as `READY`.
 */
router.put(
  '/processing-succeeded',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, pipelineReportingService.setProcessingSucceeded, [req.body]);
  })
);

/**
 * Sets the queued time for a model run or indicator.
 */
router.put(
  '/queue-runtime',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, pipelineReportingService.setRuntimeQueued, [req.body]);
  })
);

module.exports = router;
