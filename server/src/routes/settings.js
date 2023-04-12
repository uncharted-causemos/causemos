const _ = require('lodash');
const express = require('express');
const router = express.Router();
const config = require('../config/yargs-wrapper');
const schedules = _.isEmpty(config.schedules) ? [] : config.schedules.split(',');

/* Keycloak Authentication */
const keycloak = rootRequire('/config/keycloak-config.js').getKeycloak();
const { PERMISSIONS } = rootRequire('/util/auth-util.js');

const CLIENT_VAR_PREFIX = 'CLIENT__';

/* GET server settings */
router.get('/settings', keycloak.enforcer([PERMISSIONS.USER]), function (req, res, next) {
  const env = process.env;
  res.json({
    logLevel: config.logLevel,
    cacheSize: config.cacheSize,
    dojoSync: config.dojoSync,
    allowModelRuns: config.allowModelRuns,
    curationURL: env.WM_CURATION_SERVICE_URL,
    goURL: env.WM_GO_URL,
    tdDataURL: env.TD_DATA_URL,
    dyseURL: env.DYSE_URL,
    indraURL: env.INDRA_CURATION_URL,
    dartURL: env.DART_DOCUMENT_RETRIEVAL_URL,
    dojoURL: env.DOJO_URL,
    pipelineURL: env.WM_PIPELINE_URL,
    pipelineTargetS3URL: env.S3_URL,
    pipelineTargetS3IndicatorsBucket: env.S3_INDICATORS_BUCKET,
    pipelineTargetS3ModelsBucket: env.S3_MODELS_BUCKET,
    requestQueueURL: env.WM_QUEUE_SERVICE_URL,
    dojoSemanticSearch: env.DOJO_URL,
    schedules,
  });
});

/* GET client settings */
router.get('/client-settings', keycloak.protect(), function (req, res, next) {
  const env = process.env;
  const clientSettings = {};
  Object.entries(env).filter(([key, value]) => {
    if (key.startsWith(CLIENT_VAR_PREFIX)) {
      clientSettings[key] = value;
    }
  });
  res.json(clientSettings);
});

module.exports = router;
