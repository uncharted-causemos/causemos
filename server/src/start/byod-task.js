const Logger = rootRequire('/config/logger');
const dartService = rootRequire('/services/external/dart-service');
const projectService = rootRequire('/services/project-service');
const { Adapter, RESOURCE } = rootRequire('adapters/es/adapter');

/**
 * Periodically check for new documents loaded at projects' level
 */
const startBYOD = (interval) => {
  let lastTimeRecordsWereChecked = new Date().getTime();
  const MAX_PROJECT_EXTENSION_COUNT = 999;
  setInterval(async () => {
    try {
      const now = new Date().getTime();
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
      const extensions = await projectExtension.find({}, { size: MAX_PROJECT_EXTENSION_COUNT });
      Logger.info(`${extensions.length} extensions found.`);
      // Group reader records by project
      const assemblyRequests = {};
      readerRecords.forEach((record) => {
        const { document_id: readerDocumentId } = record;
        // Look for project-extension document with matching ID
        const matchingExtension = extensions.find((extension) => {
          const documentIds = extension.document.map((document) => document.document_id);
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
        const { project_id: projectId } = matchingExtension;
        if (assemblyRequests[projectId] === undefined) {
          assemblyRequests[projectId] = [];
        }
        assemblyRequests[projectId].push(record);
      });

      // For each project, add an entry to the `assembly-request` index
      const assemblyRequestCalls = Object.keys(assemblyRequests).map(async (projectId) => {
        return await projectService.addReaderOutput(
          projectId,
          assemblyRequests[projectId],
          new Date().getTime()
        );
      });

      const assemblyRequestIds = await Promise.all(assemblyRequestCalls);
      // Call the incremental assembly pipeline with each assembly request
      assemblyRequestIds.forEach(projectService.requestAssembly);
    } catch (err) {
      Logger.error('Failed to fetch document ingestion data from DART');
      Logger.error('\t' + JSON.stringify(err));
    }
  }, interval);
};

module.exports = { startBYOD };
