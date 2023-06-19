const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const semanticSearchService = rootRequire('/services/external/dojo-semantic-search-service');

/* Keycloak Authentication */
// const authUtil = rootRequire('/util/auth-util.js');

/**
 * Semantic search of features.
 */
router.get(
  '/search',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const { query } = req.query;
    if (query) {
      const result = await semanticSearchService.searchFeatures(query, '', 10);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing query.');
    }
  })
);

module.exports = router;
