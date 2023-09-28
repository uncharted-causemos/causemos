const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = require('#@/services/external/maas-service.js');
const { respondUsingCode } = require('#@/util/model-run-util.js');
const { getSelectedOutputTasks } = require('#@/util/query-param-util.js');

/**
 * Start a indicator data post processing job
 */
router.post(
  '/post-process',
  // This endpoint is accessed by scripts and Jataware using basic auth, so we
  //  don't check the user role here.
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, maasService.startIndicatorPostProcessing, [
      req.body,
      req.query.fullReplace,
      getSelectedOutputTasks(req.query),
    ]);
  })
);

module.exports = router;
