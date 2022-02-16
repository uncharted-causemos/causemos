const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const moment = require('moment');
const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');
const Logger = rootRequire('/config/logger');

/**
 * Get document based on document identifier
 */
router.get('/:docId', asyncHandler(async (req, res) => {
  const docId = req.params.docId;
  const documentAdapter = Adapter.get(RESOURCE.DOCUMENT);

  const result = await documentAdapter.findOne([
    { field: 'id', value: docId }
  ], {});
  res.json(result);
}));

/**
 * Update Document Info
*/
router.post('/:docId', asyncHandler(async (req, res) => {
  const documentAdapter = Adapter.get(RESOURCE.DOCUMENT);
  const r = await documentAdapter.update([req.body], d => d.id);
  if (r.errors) {
    Logger.warn(JSON.stringify(r));
    throw new Error('Failed to update document info');
  }
  res.status(200).send({ updateToken: moment().valueOf() });
}));

module.exports = router;
