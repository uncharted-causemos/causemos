const express = require('express');
const router = express.Router();
const config = require('../config/yargs-wrapper');

/* GET server settings */
router.get('/settings', function(req, res, next) {
  const env = process.env;
  res.json({
    logLevel: config.logLevel,
    cacheSize: config.cacheSize,
    curationURL: env.WM_CURATION_SERVICE_URL,
    goURL: env.WM_GO_URL,
    tdDataURL: env.TD_DATA_URL,
    buDataURL: env.BU_DATA_URL,
    delphiURL: env.DELPHI_URL,
    dyseURL: env.DYSE_URL,
    indraURL: env.INDRA_CURATION_URL,
    dartURL: env.DART_DOCUMENT_RETRIEVAL_URL
  });
});

module.exports = router;
