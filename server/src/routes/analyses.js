const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const analysisService = require('#@/services/analysis-service.js');

/* Keycloak Authentication */
const authUtil = require('#@/util/auth-util.js');

/**
 * GET find analysis by project
 */
router.get(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const { project_id: projectId, size } = req.query;
    const results = await analysisService.find(
      [{ field: 'project_id', value: projectId }],
      size,
      0
    );
    res.json(results);
  })
);

/**
 * GET find analysis by analysisId
 */
router.get(
  '/:analysisId',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const analysisId = req.params.analysisId;
    const results = await analysisService.find([{ field: 'id', value: analysisId }], 1, 0);
    if (!results || results.length !== 1) {
      res.json(null);
    }
    res.json(results[0]);
  })
);

/**
 * POST create new analysis
 */
router.post(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const payload = req.body;
    const r = await analysisService.createAnalysis(payload);
    res.json(r);
  })
);

/**
 * PUT update existing analysis
 */
router.put(
  '/:analysisId',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const analysisId = req.params.analysisId;
    const payload = req.body;
    await analysisService.updateAnalysis(analysisId, payload);
    res.status(200).send({ updateToken: new Date().getTime() });
  })
);

/**
 * DELETE delete analysis
 */
router.delete(
  '/:analysisId/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const analysisId = req.params.analysisId;
    await analysisService.deleteAnalysis(analysisId);
    res.status(200).send({ updateToken: new Date().getTime() });
  })
);

/**
 * GET find analysis item by analysisId and item id
 */
router.get(
  '/:analysisId/analysisitems/:analysisItemId',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const analysisId = req.params.analysisId;
    const analysisItemId = req.params.analysisItemId;
    const result = await analysisService.getAnalysisItem(analysisId, analysisItemId);
    if (!result) {
      res.json(null);
    }
    res.json(result);
  })
);

/**
 * PUT update an analysis item
 */
router.put(
  '/:analysisId/analysisitems/:analysisItemId',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const analysisId = req.params.analysisId;
    const analysisItemId = req.params.analysisItemId;
    const payload = req.body;
    await analysisService.updateAnalysisItem(analysisId, analysisItemId, payload);
    res.status(200).send({ updateToken: new Date().getTime() });
  })
);
module.exports = router;
