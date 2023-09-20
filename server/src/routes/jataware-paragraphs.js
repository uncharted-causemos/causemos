const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const paragraphSearchService = require('#@/services/external/dojo-semantic-search-service.js');

/* Keycloak Authentication */
const authUtil = require('#@/util/auth-util.js');

/**
 * get highlights for semantic search
 */
router.post(
  '/highlight',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const details = req.body;

    if (details) {
      const result = await paragraphSearchService.getHighlights(details);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing details.');
    }
  })
);

/**
 * Semantic search of paragraphs.
 */
router.get(
  '/search',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const { searchString, size } = req.query;
    if (searchString) {
      const result = await paragraphSearchService.searchParagraphs(searchString, '', size);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing query.');
    }
  })
);

router.get(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const result = await paragraphSearchService.getParagraphs();
    res.status(200);
    res.json(result);
  })
);

module.exports = router;
