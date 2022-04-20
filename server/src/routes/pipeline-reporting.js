const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const pipelineReportingService = rootRequire('/services/pipeline-reporting-service');
const { respondUsingCode } = rootRequire('/util/model-run-util.ts');

/**
 * Sets the status of the relevant ES documents to `PROCESSING FAILED`.
 */
router.put('/processing-failed', asyncHandler(async (req, res) => {
  await respondUsingCode(res, pipelineReportingService.setProcessingFailed, [req.body]);
}));

/**
 * Updates the relevant ES documents with results from the pipeline and marks them as `READY`.
 */
router.put('/processing-succeeded', asyncHandler(async (req, res) => {
  await respondUsingCode(res, pipelineReportingService.setProcessingSucceeded, [req.body]);
}));

/**
 * Sets the queued time for a model run or indicator.
 */
router.put('/queue-runtime', asyncHandler(async (req, res) => {
  await respondUsingCode(res, pipelineReportingService.setRuntimeQueued, [req.body]);
}));

module.exports = router;
