const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const paragraphSearchService = rootRequire('/services/external/dojo-semantic-search-service');

/**
 * Semantic search of paragraphs.
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { searchString } = req.query;
    if (searchString) {
      const result = await paragraphSearchService.searchParagraphs(searchString, '', 10);
      if (result === null) {
        res.status(500);
        throw new Error('Failed to query DOJO paragraphs');
      }
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
    if (result === null) {
      throw new Error('Failed to query DOJO paragraphs');
    }
    res.status = 200;
    res.json(result);
  })
);

module.exports = router;
