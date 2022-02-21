const Logger = rootRequire('/config/logger');
const serverConfiguration = rootRequire('/config/yargs-wrapper');
const { startProjectCache, refreshProjectCache } = rootRequire('/start/project-cache-task');
// const { startAddUAzOntology } = rootRequire('/start/add-ontology-task');
const { startBYOD } = rootRequire('/start/byod-task');

const READER_OUTPUT_POLL_INTERVAL = 20 * 60 * 1000; // in milliseconds
const PROJECT_CACHE_UPDATE_INTERVAL = 10 * 60 * 1000;
// const UAZ_ADD_ONTOLOGY_INTERVAL = 6 * 60 * 60 * 1000;

// DART services are currently disabled - DC, Jan 2022
const useDART = false;

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
  Logger.info(`\tSENSEI_URL: ${process.env.SENSEI_URL}`);
  Logger.info(`\tWM_CURATION_SERVICE_URL: ${process.env.WM_CURATION_SERVICE_URL}`);

  // Force project cache to refresh the first time around
  await refreshProjectCache();

  // Periodic jobs
  startProjectCache(PROJECT_CACHE_UPDATE_INTERVAL);

  // startAddUAzOntology(UAZ_ADD_ONTOLOGY_INTERVAL);

  if (useDART === true) {
    startBYOD(READER_OUTPUT_POLL_INTERVAL);
  }
}
module.exports = { runStartup };
