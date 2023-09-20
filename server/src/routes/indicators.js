const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = require('#@/services/external/maas-service.js');
const { respondUsingCode } = require('#@/util/model-run-util.js');
const { getSelectedOutputTasks } = require('#@/util/query-param-util.js');

/* Keycloak Authentication */
const authUtil = require('#@/util/auth-util.js');

/**
 * Start a indicator data post processing job
 */
router.post(
  '/post-process',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, maasService.startIndicatorPostProcessing, [
      req.body,
      req.query.fullReplace,
      getSelectedOutputTasks(req.query),
    ]);
  })
);

module.exports = router;
