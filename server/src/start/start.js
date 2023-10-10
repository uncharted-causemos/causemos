const _ = require('lodash');
const Logger = require('#@/config/logger.js');
const serverConfiguration = require('#@/config/yargs-wrapper.js');

/**
 * Runs start up jobs, e.g. any type of prefetching of sanity checks
 */
async function runStartup() {
  // Config info
  const schedules = _.isEmpty(serverConfiguration.schedules)
    ? []
    : serverConfiguration.schedules.split(',');

  Logger.info('Causemos configuration');
  Logger.info(`\tCache size: ${serverConfiguration.cacheSize}`);
  Logger.info(`\tLog level: ${serverConfiguration.logLevel}`);
  Logger.info(`\tES_URL: ${process.env.ES_URL}`);
  Logger.info(`\tWM GO URL: ${process.env.WM_GO_URL}`);
  Logger.info(`\tPipeline URL: ${process.env.WM_PIPELINE_URL}`);
  Logger.info(`\tPipeline Target S3 URL: [${process.env.S3_URL}]`);
  Logger.info(`\tPipeline Target S3 Indicators Bucket: [${process.env.S3_INDICATORS_BUCKET}]`);
  Logger.info(`\tPipeline Target S3 Model Bucket: [${process.env.S3_MODELS_BUCKET}]`);
  Logger.info(`\tQueue Service URL: ${process.env.WM_QUEUE_SERVICE_URL}`);
  Logger.info(`\tDOJO_URL: ${process.env.DOJO_URL}`);
  Logger.info(`\tSyncing changes to Dojo: ${serverConfiguration.dojoSync}`);
  Logger.info(`\tExecute model runs: ${serverConfiguration.allowModelRuns}`);
  Logger.info(`\tScheduled jobs: [${schedules}]`);
}
module.exports = { runStartup };
