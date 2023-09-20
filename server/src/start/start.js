const _ = require('lodash');
const Logger = require('#@/config/logger.js');
const serverConfiguration = require('#@/config/yargs-wrapper.js');
const { startProjectCache, refreshProjectCache } = require('#@/start/project-cache-task.js');
const { startBYOD } = require('#@/start/byod-task.js');
const { startReindex } = require('#@/start/ontology-reindex-task.js');

const READER_OUTPUT_POLL_INTERVAL = 20 * 60 * 1000; // in milliseconds
const PROJECT_CACHE_UPDATE_INTERVAL = 10 * 60 * 1000;
const ONTOLOGY_REINDEX_INTERVAL = 6 * 60 * 60 * 1000;

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
  Logger.info(`\tTD_DATA_URL: ${process.env.TD_DATA_URL}`);
  Logger.info(`\tWM GO URL: ${process.env.WM_GO_URL}`);
  Logger.info(`\tPipeline URL: ${process.env.WM_PIPELINE_URL}`);
  Logger.info(`\tPipeline Target S3 URL: [${process.env.S3_URL}]`);
  Logger.info(`\tPipeline Target S3 Indicators Bucket: [${process.env.S3_INDICATORS_BUCKET}]`);
  Logger.info(`\tPipeline Target S3 Model Bucket: [${process.env.S3_MODELS_BUCKET}]`);
  Logger.info(`\tQueue Service URL: ${process.env.WM_QUEUE_SERVICE_URL}`);
  Logger.info(`\tDYSE_URL: ${process.env.DYSE_URL}`);
  Logger.info(`\tDOJO_URL: ${process.env.DOJO_URL}`);
  Logger.info(`\tWM_CURATION_SERVICE_URL: ${process.env.WM_CURATION_SERVICE_URL}`);
  Logger.info(`\tSyncing changes to Dojo: ${serverConfiguration.dojoSync}`);
  Logger.info(`\tExecute model runs: ${serverConfiguration.allowModelRuns}`);
  Logger.info(`\tScheduled jobs: [${schedules}]`);

  // Force project cache to refresh the first time around
  await refreshProjectCache();

  // Periodic jobs
  startProjectCache(PROJECT_CACHE_UPDATE_INTERVAL);

  if (schedules.includes('aligner')) {
    Logger.info('Scheduling cocnept-aligner updates');
    startReindex(ONTOLOGY_REINDEX_INTERVAL);
  }
  if (schedules.includes('dart')) {
    Logger.info('Scheduling DART BYOD updates');
    startBYOD(READER_OUTPUT_POLL_INTERVAL);
  }
}
module.exports = { runStartup };
