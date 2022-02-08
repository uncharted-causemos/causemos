const { v4: uuid } = require('uuid');
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

  // Only know how to parse GET requests for sure
  if (req.method === 'GET') {
    if (req.query.filters) parameters = JSON.parse(req.query.filters);
    else if (req.query.filter) parameters = JSON.parse(req.query.filter);
    else parameters = [];
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
      try {
        Logger.info(`Flushing ${buffer.length} session activity entries`);
        sessionLogAdapter.insert(buffer, () => uuid());
      } catch (err) {
        Logger.warn(err);
      } finally {
        buffer = [];
        timeId = null;
      }
    }, 45000);
  }
};

module.exports = {
  logRequest
};
