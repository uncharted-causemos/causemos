const uuid = require('uuid');
const Logger = rootRequire('/config/logger');
const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');

const sessionLogAdapter = Adapter.get(RESOURCE.SESSION_LOG);
let buffer = [];
let timeId = null;

/**
 * @param {object} req - request object
 */
const logRequest = async (req) => {
  let parameters = null;
  if (req.method === 'GET' && req.query.filters) {
    parameters = JSON.parse(req.query.filters);
  } else {
    parameters = Object.keys(req.body);
  }

  buffer.push({
    session: req.sessionID,
    timestamp: Date.now(),
    request_path: req.path,
    request_method: req.method,
    parameters: parameters
  });

  // Buffer up the logs so we don't put too much strain, wait 30 seconds before flushing to datastore
  if (!timeId) {
    timeId = setTimeout(() => {
      Logger.info(`Flushing ${buffer.length} session activity entries`);
      sessionLogAdapter.insert(buffer, () => uuid());
      buffer = [];
      timeId = null;
    }, 30000);
  }
};

module.exports = {
  logRequest
};
