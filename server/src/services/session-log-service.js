const { v4: uuid } = require('uuid');
const Logger = require('#@/config/logger.js');
const { Adapter, RESOURCE } = require('#@/adapters/es/adapter.js');

const sessionLogAdapter = Adapter.get(RESOURCE.SESSION_LOG);
let buffer = [];
let timeId = null;

/**
 * @param {object} req - request object
 */
const logRequest = async (req) => {
  let parameters = null;

  // Don't self log
  if (req.path.includes('session-log')) return;

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
    parameters: parameters,
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
  logRequest,
};
