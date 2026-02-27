import express from 'express';
import asyncHandler from 'express-async-handler';
import * as dojoSearchService from '#@/services/external/dojo-semantic-search-service.js';
import * as authUtil from '#@/util/auth-util.js';

const router = express.Router();

/**
 * get both causes and effects
 */
router.post(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const details = req.body;

    if (details) {
      const result = await dojoSearchService.getCausesAndEffects(details);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing details.');
    }
  })
);

/**
 * get causes
 */
router.post(
  '/causes',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const details = req.body;

    if (details) {
      const result = await dojoSearchService.getCauses(details);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing details.');
    }
  })
);

/**
 * get effects
 */
router.post(
  '/effects',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const details = req.body;

    if (details) {
      const result = await dojoSearchService.getEffects(details);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing details.');
    }
  })
);

export default router;
