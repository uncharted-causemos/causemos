const _ = require('lodash');
const express = require('express');
const router = express.Router();
const config = require('../config/yargs-wrapper');
const schedules = _.isEmpty(config.schedules) ? [] : config.schedules.split(',');

/* Keycloak Authentication */
const authUtil = require('#@/util/auth-util.js');

const CLIENT_VAR_PREFIX = 'CLIENT__';

/* GET server settings */
router.get('/settings', authUtil.checkRole([authUtil.ROLES.USER]), function (req, res, next) {
  const env = process.env;
  res.json({
    logLevel: config.logLevel,
    cacheSize: config.cacheSize,
    dojoSync: config.dojoSync,
    allowModelRuns: config.allowModelRuns,
    goURL: env.WM_GO_URL,
    esURL: env.ES_URL,
    dojoURL: env.DOJO_URL,
    pipelineURL: env.WM_PIPELINE_URL,
    pipelineTargetS3IndicatorsBucket: env.S3_INDICATORS_BUCKET,
    pipelineTargetS3ModelsBucket: env.S3_MODELS_BUCKET,
    requestQueueURL: env.WM_QUEUE_SERVICE_URL,
    schedules,
  });
});

/* GET client settings */
router.get(
  '/client-settings',
  authUtil.checkRole([authUtil.ROLES.USER]),
  function (req, res, next) {
    const env = process.env;
    const clientSettings = {};
    Object.entries(env).filter(([key, value]) => {
      if (key.startsWith(CLIENT_VAR_PREFIX)) {
        clientSettings[key] = value;
      }
    });
    res.json(clientSettings);
  }
);

module.exports = router;
