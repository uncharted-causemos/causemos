const Logger = rootRequire('/config/logger');

const { set } = rootRequire('/cache/node-lru-cache');
const projectService = rootRequire('/services/project-service');
const dartService = rootRequire('/services/external/dart-service');
const { Adapter, RESOURCE } = rootRequire('adapters/es/adapter');

const READER_OUTPUT_POLL_INTERVAL = 30 * 60 * 1000; // in milliseconds

/**
 * Runs start up jobs, e.g. any type of prefetching of sanity checks
 */
async function runStartup() {
  Logger.info('=== Running server up jobs ===');

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

  let lastTimeRecordsWereChecked = (new Date()).getTime() || 0;
  const MAX_PROJECT_EXTENSION_COUNT = 999;
  setInterval(async () => {
    try {
      const now = (new Date()).getTime() || 0;
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
          Logger.error(
            `Unable to find extension for record with document_id ${readerDocumentId}.`
          );
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

  Logger.info('=== Done server start up jobs ===');
}
module.exports = { runStartup };
