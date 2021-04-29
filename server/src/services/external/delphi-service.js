const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');

// Delphi model states
// - training

/**
 * Register model on Delphi: sending the id, statements and indicators
 * @param {object} payload
 */
const createModel = async (payload) => {
  Logger.info('creating model in delphi');

  // create to delphi
  const delphiOptions = {
    method: 'POST',
    url: process.env.DELPHI_URL + '/delphi/create-model',
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: payload
  };

  const result = await requestAsPromise(delphiOptions);
  const nodes = result.conceptIndicators;
  const edges = result.relations.reduce((acc, edge) => {
    const key = `${edge.source}///${edge.target}`;
    acc[key] = {};
    // FIXME: Delphi returns distributions, for now just default [0.5, 0.5]
    acc[key].weights = [0.5, 0.5];
    return acc;
  }, {});
  return { nodes, edges, status: result.status };
};

/**
 * Get current model status and parameterizations
 */
const modelStatus = async (modelId) => {
  Logger.info(`checking delphi model status ${modelId}`);

  // create to delphi
  const delphiOptions = {
    method: 'GET',
    url: process.env.DELPHI_URL + '/delphi/models/' + modelId,
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: {}
  };
  const result = await requestAsPromise(delphiOptions);
  return result;
};

const createExperiment = async (modelId, payload) => {
  const options = {
    url: process.env.DELPHI_URL + `/delphi/models/${modelId}/experiments`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    json: payload
  };
  const result = await requestAsPromise(options);
  return result;
};

/**
 * Retrieves the result of projection from Delphi via experiment ID
 *
 * @param {string} modelId      - model identifier
 * @param {string} experimentId - external experiment identifier
 */
const findExperiment = async (modelId, experimentId) => {
  const options = {
    url: process.env.DELPHI_URL + `/delphi/models/${modelId}/experiments/${experimentId}`,
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    // HACK: This causes DELPHI to send back properly formatted json in the response. Note that the json option is not meant for this purpose.
    // TODO: Resolve this issue on the DELPHI side
    json: {}
  };
  const result = await requestAsPromise(options);
  return result;
};


module.exports = {
  createModel,
  createExperiment,
  modelStatus,
  findExperiment
};
