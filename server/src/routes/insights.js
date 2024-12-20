const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const insightService = require('#@/services/insight-service.js');

/* Keycloak Authentication */
const authUtil = require('#@/util/auth-util.js');

/**
 * POST commit for an insight
 */
router.post(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      // modified_at -> automatically added inside the function createInsight()
      visibility,
      project_id,
      context_id,
      url,
      target_view,
      pre_actions,
      post_actions,
      is_default,
      image,
      view_state,
      data_state,
      annotation_state,
      metadata,
      schemaVersion,
      type,
      view,
      state,
    } = req.body;
    const result = await insightService.createInsight(
      name,
      description,
      visibility,
      project_id,
      context_id,
      url,
      target_view,
      pre_actions,
      post_actions,
      is_default,
      image,
      view_state,
      data_state,
      annotation_state,
      metadata,
      schemaVersion,
      type,
      view,
      state
    );
    res.json(result);
  })
);

/**
 * Update an insight doc
 */
router.put(
  '/:id',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const insightId = req.params.id;
    const insight = req.body;
    insight.id = insight.id || insightId;
    await insightService.updateInsight(insightId, insight);
    res.status(200).send({ updated: 'success' });
  })
);

/**
 * GET a list of insights
 */
router.get(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const filterParams = JSON.parse(req.query.filters);
    const options = JSON.parse(req.query.options) || {};
    const result = await insightService.getAllInsights(filterParams, options);
    res.json(result);
  })
);
// POST version
router.post(
  '/search',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const filterParams = req.body.filters;
    const options = req.body.options || {};
    const result = await insightService.getAllInsights(filterParams, options);
    res.json(result);
  })
);

/**
 * GET a count of insights
 **/
router.get(
  '/count',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const filterParams = JSON.parse(req.query.filters);
    const result = await insightService.count(filterParams);
    res.json(result);
  })
);

/**
 * GET an insight by id
 */
router.get(
  '/:id',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const insightId = req.params.id;
    const allowList = req.query.allowList;
    const result = await insightService.getInsight(insightId, allowList);
    res.status(200);
    res.json(result);
  })
);

/**
 * GET an insight thumbnail by id
 */
router.get(
  '/:id/thumbnail',
  // This endpoint is accessed by the `src` attribute on an `img` element in
  //  the frontend. Those requests do not have any keycloak auth information,
  //  so we don't check the role here.
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const insightId = req.params.id;
    const thumbnail = await insightService.getInsightThumbnail(insightId);
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': thumbnail.length,
    });
    res.end(thumbnail);
  })
);

/**
 * DELETE existing insight
 */
router.delete(
  '/:id',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const insightId = req.params.id;
    const result = await insightService.remove(insightId);
    res.status(200);
    res.json(result);
  })
);

module.exports = router;
