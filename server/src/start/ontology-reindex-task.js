const Logger = require('#@/config/logger.js');
const concepAlignerService = require('#@/services/external/concept-aligner-service.js');

const startReindex = (interval) => {
  setInterval(async () => {
    Logger.info('=== Reindexing concept-aligner ===');
    const r = await concepAlignerService.reindex();
    Logger.info(`Reindex result ${r}`);
  }, interval);
};

module.exports = { startReindex };
