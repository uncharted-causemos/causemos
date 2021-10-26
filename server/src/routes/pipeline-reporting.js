const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = rootRequire('/services/external/maas-service');
const datacubeService = rootRequire('/services/datacube-service');

/**
 * Processing failed endpoint sets the status of the relevant ES documents to `PROCESSING FAILED`.
 */
router.put('/processing-failed', asyncHandler(async (req, res) => {
  const body = req.body;
  const docIds = body.doc_ids;
  const isIndicator = body.is_indicator;
  const newStatus = 'PROCESSING_FAILED';
  if (isIndicator) {
    const metadataDelta = docIds.map(docId => {
      return {
        id: docId,
        status: newStatus
      };
    });
    datacubeService.updateDatacube(metadataDelta);
  } else {
    const modelRun = docIds.map(docId => {
      return {
        id: docId,
        status: newStatus
      };
    });
    maasService.updateModelRun(modelRun);
  }
}));

module.exports = router;
