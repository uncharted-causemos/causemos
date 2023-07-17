const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = rootRequire('/services/external/maas-service');
const { respondUsingCode } = rootRequire('/util/model-run-util.ts');
const { getSelectedOutputTasks } = rootRequire('/util/query-param-util.js');

/**
 * Start a indicator data post processing job
 */
router.post(
  '/post-process',
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, maasService.startIndicatorPostProcessing, [
      req.body,
      req.query.fullReplace,
      getSelectedOutputTasks(req.query),
    ]);
  })
);

module.exports = router;
