const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Logger = require('#@/config/logger.js');
const maasService = require('#@/services/external/maas-service.js');

/* Keycloak Authentication */
// const authUtil = require('#@/util/auth-util.js);

/**
 * Add a tag to all the model runs that match the specified filter
 */
router.put(
  '/',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const filter = req.body.filter;
    const tag = req.body.tag;
    try {
      const result = await maasService.addModelTag(filter, tag);
      res.status(200).json(result);
    } catch (e) {
      Logger.error(e);
    }
  })
);

/**
 * Remove a tag from all the model runs that match the specified filter
 */
router.delete(
  '/',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const filter = JSON.parse(req.query.filter);
    const tag = req.query.tag;
    try {
      const result = await maasService.removeModelTag(filter, tag);
      res.status(200).json(result);
    } catch (e) {
      Logger.error(e);
    }
  })
);

/**
 * Rename a tag in all the model runs that match the specified filter
 */
router.patch(
  '/',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const filter = req.body.filter;
    const oldTag = req.body.oldTag;
    const newTag = req.body.newTag;
    try {
      const result = await maasService.renameModelTag(filter, oldTag, newTag);
      res.status(200).json(result);
    } catch (e) {
      Logger.error(e);
    }
  })
);

module.exports = router;
