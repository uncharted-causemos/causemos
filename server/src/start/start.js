const Logger = rootRequire('/config/logger');
const serverConfiguration = rootRequire('/config/yargs-wrapper');
const { set } = rootRequire('/cache/node-lru-cache');
const projectService = rootRequire('/services/project-service');
const dartService = rootRequire('/services/external/dart-service');
const { Adapter, RESOURCE } = rootRequire('adapters/es/adapter');

const READER_OUTPUT_POLL_INTERVAL = 20 * 60 * 1000; // in milliseconds

/**
 * Runs start up jobs, e.g. any type of prefetching of sanity checks
 */
async function runStartup() {
  Logger.info('Causemos configuration');
  Logger.info(`\tCache size: ${serverConfiguration.cacheSize}`);
  Logger.info(`\tLog level: ${serverConfiguration.logLevel}`);
  Logger.info(`\tTD_DATA_URL: ${process.env.TD_DATA_URL}`);
  Logger.info(`\tWM GO URL: ${process.env.WM_GO_URL}`);
  Logger.info(`\tPipeline URL: ${process.env.WM_PIPELINE_URL}`);
  Logger.info(`\tDELPHI_URL: ${process.env.DELPHI_URL}`);
  Logger.info(`\tDYSE_URL: ${process.env.DYSE_URL}`);
  Logger.info(`\tWM_CURATION_SERVICE_URL: ${process.env.WM_CURATION_SERVICE_URL}`);

  Logger.info('=== Running causemos start up jobs ===');

  // List all of the projects
  Logger.info('Caching projects metadata');
  const projects = await projectService.listProjects();

  const projectModels = await Adapter.get(RESOURCE.MODEL).getFacets('project_id');
  const projectModelsMap = projectModels.reduce((acc, d) => {
    acc[d.key] = d.doc_count;
    return acc;
  }, {});

  const projectAnalyses = await Adapter.get(RESOURCE.ANALYSIS).getFacets('project_id');
  const projectAnalysesMap = projectAnalyses.reduce((acc, d) => {
    acc[d.key] = d.doc_count;
    return acc;
  }, {});

  projects.map(project => {
    set(project.id, {
      ...project,
      stat: {
        model_count: projectModelsMap[project.id] || 0,
        data_analysis_count: projectAnalysesMap[project.id] || 0
      }
    });
  });

  let lastTimeRecordsWereChecked = (new Date()).getTime();
  const MAX_PROJECT_EXTENSION_COUNT = 999;
  setInterval(async () => {
    try {
      const now = (new Date()).getTime();
      Logger.info('=== Fetching reader status records from DART. ===', lastTimeRecordsWereChecked);
      const result = await dartService.queryReadersStatus(lastTimeRecordsWereChecked);
      // Records successfully checked. Next time, only check for records since `now`.
      lastTimeRecordsWereChecked = now;
      const readerRecords = JSON.parse(result).records || [];
      Logger.info(`${readerRecords.length} records found.`);
      if (readerRecords.length > 0) {
        Logger.info(JSON.stringify(readerRecords));
      }
      // Grab all documents from project-extension
      Logger.info('=== Fetching project extensions records. ===');
      const projectExtension = Adapter.get(RESOURCE.PROJECT_EXTENSION);
      const extensions = await projectExtension.find(
        {},
        { size: MAX_PROJECT_EXTENSION_COUNT }
      );
      Logger.info(`${extensions.length} extensions found.`);
      // Group reader records by project
      const assemblyRequests = {};
      readerRecords.forEach(record => {
        const { document_id: readerDocumentId } = record;
        // Look for project-extension document with matching ID
        const matchingExtension = extensions.find(extension => {
          const documentIds = extension.document.map(document => document.document_id);
          return documentIds.includes(readerDocumentId);
        });
        if (matchingExtension === undefined) {
          // FIXME: this error is being printed for thousands of records, we should investigate why
          //  so many records without matching extensions are being found every 20 minutes.
          // Logger.error(
          //   `Unable to find extension for record with document_id ${readerDocumentId}.`
          // );
          return;
        }
        const { project_id } = matchingExtension;
        if (assemblyRequests[project_id] === undefined) {
          assemblyRequests[project_id] = [];
        }
        assemblyRequests[project_id].push(record);
      });

      // For each project, add an entry to the `assembly-request` index
      const assemblyRequestCalls = Object.keys(assemblyRequests).map(async projectId => {
        return await projectService.addReaderOutput(
          projectId,
          assemblyRequests[projectId],
          (new Date()).getTime()
        );
      });

      const assemblyRequestIds = await Promise.all(assemblyRequestCalls);
      // Call the incremental assembly pipeline with each assembly request
      assemblyRequestIds.forEach(projectService.requestAssembly);
    } catch (err) {
      Logger.error(err);
      Logger.error(JSON.stringify(err));
    }
  }, READER_OUTPUT_POLL_INTERVAL);

  Logger.info('=== Done causemos start up jobs ===');
}
module.exports = { runStartup };
