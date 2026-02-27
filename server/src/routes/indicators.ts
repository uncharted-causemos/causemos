import express from 'express';
import asyncHandler from 'express-async-handler';
import * as maasService from '#@/services/external/maas-service.js';
import { respondUsingCode } from '#@/util/model-run-util.js';
import { getSelectedOutputTasks } from '#@/util/query-param-util.js';

const router = express.Router();

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

export default router;
