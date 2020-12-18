const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');

/**
 * Get document based on document identifier
 */
router.get('/:docId', asyncHandler(async (req, res) => {
  const docId = req.params.docId;
  const documentAdapter = Adapter.get(RESOURCE.DOCUMENT);

  const result = await documentAdapter.findOne([
    { field: 'doc_id', value: docId }
  ], {});
  res.json(result);
}));

module.exports = router;
