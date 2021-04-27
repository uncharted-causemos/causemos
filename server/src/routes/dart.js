const express = require('express');
const asyncHandler = require('express-async-handler');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

const dartService = rootRequire('/services/external/dart-service');

/**
 * GET DART document from the docker service used for managing dart documents
 *
 * Note: This endpoint is meant to be used for fetching the document
 * from the dart service and sending it back in the original request.
 */
router.get('/:docId/raw', asyncHandler(async (req, res, next) => {
  const docId = req.params.docId;
  const docStream = await dartService.getRawDoc(docId);
  docStream.on('error', error => {
    console.error(error);
    return next(new Error('Failed to fetch raw PDF'));
  });
  docStream.pipe(res);
}));

router.post('/corpus', upload.single('file'), [], asyncHandler(async (req, res) => {
  const metadata = req.body.metadata;
  const results = await dartService.uploadDocument(req.file, metadata);
  res.json(results);
}));

router.get('/readers-status', asyncHandler(async (req, res, next) => {
  const timestamp = req.query.timestamp || 0;

  try {
    const result = await dartService.queryReadersStatus(timestamp);
    res.json(JSON.parse(result));
  } catch (err) {
    res.json({ records: [{ identity: 'eidos', version: '1.1.0', document_id: '0a6200447248b0bfb4a67d0fb5e84cbd', storage_key: 'fa318773-2b58-4a32-8891-ae548551b022.jsonld' }, { identity: 'eidos', version: '1.1.0', document_id: '2abf581c664923ed83f25c17fe1ddd50', storage_key: '0e0f6e1f-49b8-446d-b15c-77ee433c324a.jsonld' }, { identity: 'eidos', version: '1.1.0', document_id: '2bb0fd1f905675cd7a99a0d900bc1981', storage_key: 'b5712f59-80b7-470a-be6e-9b4d7fc652c4.jsonld' }] });
  }
}));

/**
 * POST send file from local machine to the DART server for processing.
 *
 * Note: This endpoint is meant to be used for sending documents to the
 * dart service to get the document meta information.
 */
// router.post('/extract-metadata', upload.single('file'), [], asyncHandler(async (req, res) => {
//   const results = await dartService.sendFileForExtraction(req.file);
//   res.json(results);
// }));

/**
 * POST send file and user modified document extraction to DART.
 *
 * Note: This endpoint is meant to be used for sending document meta information
 * to the server so that the information can be processed.
 */
// router.post('/submit', upload.single('file'), [], asyncHandler(async (req, res) => {
//   const extractedCdr = JSON.parse(req.body.extracted_cdr);
//   const submitResult = await dartService.submitCdrExtractionToDart(extractedCdr);
//   const results = await dartService.uploadToDart(req.file, submitResult.document_id);
//   res.json(results);
// }));

module.exports = router;
