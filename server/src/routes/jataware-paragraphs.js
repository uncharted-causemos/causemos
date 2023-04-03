const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const paragraphSearchService = rootRequire('/services/external/dojo-semantic-search-service');

/**
 * get highlights for semantic search
 */
router.post(
  '/highlight',
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
  asyncHandler(async (req, res) => {
    const { searchString } = req.query;
    if (searchString) {
      const result = await paragraphSearchService.searchParagraphs(searchString, '', 10);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing query.');
    }
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await paragraphSearchService.getParagraphs();
    res.status(200);
    res.json(result);
  })
);

module.exports = router;
