const requestAsPromise = rootRequire('/util/request-as-promise');
const Logger = rootRequire('/config/logger');

/**
 * Fetch a file from http://10.64.16.209:4005/demo-data-2021-04
 */
const fetchDemoData = async (modelId, runId, type) => {
  Logger.info(`Fetching file for ${modelId} ${runId} ${type}`);
  const url = (!runId && type === 'metadata')
    ? `http://10.64.16.209:4005/demo-data-2021-04/${modelId}.${type}.json`
    : `http://10.64.16.209:4005/demo-data-2021-04/${modelId}/${runId}.${type}.json`;

  return requestAsPromise({ method: 'GET', url }).catch(err => {
    console.log(err);
  });
};

module.exports = {
  fetchDemoData
};
