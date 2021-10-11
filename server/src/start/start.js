const Logger = rootRequire('/config/logger');
const serverConfiguration = rootRequire('/config/yargs-wrapper');
const searchService = rootRequire('/services/search-service');
const { startProjectCache } = require('./project-cache-task');
const { startBYOD } = require('./byod-task');

const READER_OUTPUT_POLL_INTERVAL = 20 * 60 * 1000; // in milliseconds
const PROJECT_CACHE_UPDDATE_INTERVAL = 10 * 60 * 1000;

/**
 * Runs start up jobs, e.g. any type of prefetching of sanity checks
 */
async function runStartup() {
  // Config info
  Logger.info('Causemos configuration');
  Logger.info(`\tCache size: ${serverConfiguration.cacheSize}`);
  Logger.info(`\tLog level: ${serverConfiguration.logLevel}`);
  Logger.info(`\tTD_DATA_URL: ${process.env.TD_DATA_URL}`);
  Logger.info(`\tWM GO URL: ${process.env.WM_GO_URL}`);
  Logger.info(`\tPipeline URL: ${process.env.WM_PIPELINE_URL}`);
  Logger.info(`\tQueue Service URL: ${process.env.WM_QUEUE_SERVICE_URL}`);
  Logger.info(`\tDELPHI_URL: ${process.env.DELPHI_URL}`);
  Logger.info(`\tDYSE_URL: ${process.env.DYSE_URL}`);
  Logger.info(`\tWM_CURATION_SERVICE_URL: ${process.env.WM_CURATION_SERVICE_URL}`);

  // Periodic jobs
  startProjectCache(PROJECT_CACHE_UPDDATE_INTERVAL);
  startBYOD(READER_OUTPUT_POLL_INTERVAL);

  try {
    // const projectId = 'project-d0e4ecc0-4f0b-4383-8d71-ef0f3a3492a4';
    const projectId = 'project-0f6c6466-b53f-4189-9fd1-e1f8b53f7787';
    const xyz = await searchService.entitySearch(projectId, 'food*');
    console.log(JSON.stringify(xyz, null, 2));
  } catch (err) {
    console.error(err);
  }
}
module.exports = { runStartup };
