const Logger = rootRequire('/config/logger');
const concepAlignerService = rootRequire('/services/external/concept-aligner-service');

const startReindex = (interval) => {
  setInterval(async () => {
    Logger.info('=== Reindexing concept-aligner ===');
    const r = await concepAlignerService.reindex();
    Logger.info(`Reindex result ${r}`);
  }, interval);
};

module.exports = { startReindex };
