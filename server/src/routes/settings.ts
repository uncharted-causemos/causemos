import _ from 'lodash';
import express, { Request, Response, NextFunction } from 'express';
import config from '#@/config/yargs-wrapper.js';
import * as authUtil from '#@/util/auth-util.js';

const router = express.Router();

const schedules = _.isEmpty(config.schedules) ? [] : config.schedules.split(',');

const CLIENT_VAR_PREFIX = 'CLIENT__';

/* GET server settings */
router.get(
  '/settings',
  authUtil.checkRole([authUtil.ROLES.USER]),
  function (req: Request, res: Response, _next: NextFunction) {
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
  }
);

/* GET client settings */
router.get(
  '/client-settings',
  authUtil.checkRole([authUtil.ROLES.USER]),
  function (req: Request, res: Response, _next: NextFunction) {
    const env = process.env;
    const clientSettings: Record<string, string | undefined> = {};
    Object.entries(env).filter(([key, value]) => {
      if (key.startsWith(CLIENT_VAR_PREFIX)) {
        clientSettings[key] = value;
      }
    });
    res.json(clientSettings);
  }
);

export default router;
