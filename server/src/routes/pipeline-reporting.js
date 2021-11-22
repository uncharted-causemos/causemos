const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const pipelineReportingService = rootRequire('/services/pipeline-reporting-service');
const { respondUsingCode } = rootRequire('/util/model-run-util.ts');

/**
 * Processing failed endpoint sets the status of the relevant ES documents to `PROCESSING FAILED`.
 */
router.put('/processing-failed', asyncHandler(async (req, res) => {
  await respondUsingCode(req, res, pipelineReportingService.setProcessingFailed);
}));

/**
 * Processing succeeded endpoint sets the status of the relevant ES documents to `READY`.
 */
router.put('/processing-succeeded', asyncHandler(async (req, res) => {
  await respondUsingCode(req, res, pipelineReportingService.setProcessingSucceeded);
}));

/**
 * Queue runtime endpoint sets the runtimes.queued fields for a model run.
 */
router.put('/queue-runtime', asyncHandler(async (req, res) => {
  await respondUsingCode(req, res, pipelineReportingService.setRuntimeQueued);
}));

module.exports = router;
