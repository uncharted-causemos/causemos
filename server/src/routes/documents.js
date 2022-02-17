const express = require('express');
const asyncHandler = require('express-async-handler');
const { spawn } = require('child_process');
const router = express.Router();
const moment = require('moment');
const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');
const Logger = rootRequire('/config/logger');

const spawnUpdateProcess = (documentId) => {
  const child = spawn('node', ['./src/scripts/document-indexer.js', documentId]);
  child.stdout.on('data', (data) => {
    Logger.info(`stdout ${child.pid}:\n\t${data}`);
  });

  child.stderr.on('data', (data) => {
    Logger.info(`stderr ${child.pid}:\n\t${data}`);
  });

  child.on('error', (error) => {
    Logger.warn(`error ${child.pid}:\n\t${error.message}`);
  });

  child.on('close', (code) => {
    Logger.info(`child process ${child.pid} exited with code ${code}`);
  });
};


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

  spawnUpdateProcess(req.body.id);
  res.status(200).send({ updateToken: moment().valueOf() });
}));

module.exports = router;
