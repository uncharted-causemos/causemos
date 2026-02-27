import express from 'express';
import asyncHandler from 'express-async-handler';
import * as paragraphSearchService from '#@/services/external/dojo-semantic-search-service.js';
import * as authUtil from '#@/util/auth-util.js';

const router = express.Router();

router.get(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const { scroll_id, size, sort_by, order } = req.query;
    const result = await paragraphSearchService.getDocuments(
      scroll_id as string,
      size ? Number(size) : undefined,
      sort_by as string,
      order as string
    );
    res.status(200);
    res.json(result);
  })
);

router.get(
  '/:docId',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const docId = req.params.docId;
    if (docId) {
      const result = await paragraphSearchService.getDocument(docId);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing docId parameter');
    }
  })
);

router.get(
  '/:docId/paragraphs',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const docId = req.params.docId;
    const scrollId = req.query.scroll_id;
    const minParagraphs = req.query.min_paragraphs;

    if (docId) {
      const result = await paragraphSearchService.getDocumentParagraphs(
        docId,
        minParagraphs ? Number(minParagraphs) : undefined,
        (scrollId as string) ?? null
      );
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing docId parameter');
    }
  })
);

export default router;
