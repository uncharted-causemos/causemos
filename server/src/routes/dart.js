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
