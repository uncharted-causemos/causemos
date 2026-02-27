import express from 'express';
import asyncHandler from 'express-async-handler';
import * as maasService from '#@/services/external/maas-service.js';
import * as authUtil from '#@/util/auth-util.js';
import Logger from '#@/config/logger.js';

const router = express.Router();

/**
 * Add a tag to all the model runs that match the specified filter
 */
router.put(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
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
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const filter = JSON.parse(req.query.filter as string);
    const tag = req.query.tag as string;
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
  authUtil.checkRole([authUtil.ROLES.USER]),
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

export default router;
