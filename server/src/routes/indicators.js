const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = rootRequire('/services/external/maas-service');
const { respondUsingCode } = rootRequire('/util/model-run-util.ts');

/* Keycloak Authentication */
// const authUtil = rootRequire('/util/auth-util.js');

/**
 * Start a indicator data post processing job
 */
router.post(
  '/post-process',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, maasService.startIndicatorPostProcessing, [
      req.body,
      req.query.fullReplace,
    ]);
  })
);

module.exports = router;
