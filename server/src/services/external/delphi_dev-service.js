const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');

const DELPHI_DEV_URL = 'http://ivilab.org/delphi-api';

/**
 * Register model on Delphi: sending the id, statements and indicators
 * @param {object} payload
 */
const createModel = async (payload) => {
  Logger.info('creating model in delphi');

  // create to delphi
  const delphiOptions = {
    method: 'POST',
    url: DELPHI_DEV_URL + '/create-model',
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
    acc[key].weights = [0.0, 0.5]; // placeholder, Delphi returns weights after training
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
    url: DELPHI_DEV_URL + '/models/' + modelId,
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
    url: DELPHI_DEV_URL + `/models/${modelId}/experiments`,
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
    url: DELPHI_DEV_URL + `/models/${modelId}/experiments/${experimentId}`,
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    json: {}
  };
  const result = await requestAsPromise(options);
  return result;
};

const modelTrainingProgress = async (modelId) => {
  const options = {
    url: process.env.DELPHI_URL + `/models/${modelId}/training-progress`,
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    json: {}
  };
  const result = await requestAsPromise(options);
  return result;
};

const updateEdgeParameter = async (modelId, edges) => {
  const options = {
    url: process.env.DELPHI_URL + `/models/${modelId}/edit-edges`,
    method: 'POST',
    headers: {
      Accept: 'application/json'
    },
    json: { relations: edges }
  };
  const result = await requestAsPromise(options);
  return result;
};

module.exports = {
  createModel,
  createExperiment,
  modelStatus,
  findExperiment,

  modelTrainingProgress,
  updateEdgeParameter
};
