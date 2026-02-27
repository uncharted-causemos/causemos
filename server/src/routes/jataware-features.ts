import express from 'express';
import asyncHandler from 'express-async-handler';
import * as semanticSearchService from '#@/services/external/dojo-semantic-search-service.js';
import * as authUtil from '#@/util/auth-util.js';

const router = express.Router();

/**
 * Semantic search of features.
 */
router.get(
  '/search',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const { query } = req.query;
    if (query) {
      const result = await semanticSearchService.searchFeatures(query as string, '', 10);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing query.');
    }
  })
);

export default router;
