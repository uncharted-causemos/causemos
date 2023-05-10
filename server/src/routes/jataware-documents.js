const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const paragraphSearchService = rootRequire('/services/external/dojo-semantic-search-service');

/* Keycloak Authentication */
const authUtil = rootRequire('/util/auth-util.js');

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
        minParagraphs,
        scrollId ?? null
      );
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing docId parameter');
    }
  })
);

module.exports = router;
