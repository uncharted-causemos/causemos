const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const pipelineReportingService = rootRequire('/services/pipeline-reporting-service');

/**
 * Processing failed endpoint sets the status of the relevant ES documents to `PROCESSING FAILED`.
 */
router.put('/processing-failed', asyncHandler(async (req, res) => {
  const { respondUsingCode } = rootRequire('/util/model-run-util.ts');
  await respondUsingCode(req, res, pipelineReportingService.setProcessingFailed);
}));

/**
 * Processing failed endpoint sets the status of the relevant ES documents to `PROCESSING FAILED`.
 */
router.put('/processing-succeeded', asyncHandler(async (req, res) => {
  const { respondUsingCode } = rootRequire('/util/model-run-util.ts');
  await respondUsingCode(req, res, pipelineReportingService.setProcessingSucceeded);
}));

module.exports = router;
