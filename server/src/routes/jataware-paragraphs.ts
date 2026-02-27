import express from 'express';
import asyncHandler from 'express-async-handler';
import * as paragraphSearchService from '#@/services/external/dojo-semantic-search-service.js';
import * as authUtil from '#@/util/auth-util.js';

const router = express.Router();

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
      const result = await paragraphSearchService.searchParagraphs(
        searchString as string,
        '',
        size ? Number(size) : undefined
      );
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

export default router;
