// const _ = require('lodash');
const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');
const auth = rootRequire('/util/auth-util');

const basicAuthToken = auth.getBasicAuthToken(process.env.DYSE_USERNAME, process.env.DYSE_PASSWORD);

const DYSE_URL = process.env.DYSE_URL + '/DySE';

/**
 * Register model on DySE: sending the id, statements and indicators
 * @param {object} payload
 */
const createModel = async (payload) => {
  Logger.info('Create Dyse model');

  const dyseOptions = {
    method: 'POST',
    url: DYSE_URL + '/create-model',
    headers: {
      'Authorization': basicAuthToken,
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: payload
  };

  const result = await requestAsPromise(dyseOptions);
  if (result.status !== 'success') {
    throw new Error(JSON.stringify(result));
  }

  Logger.debug(JSON.stringify(result.relations, null, 2));

  // Transform result to node/edge initialization maps
  const nodes = result.conceptIndicators;
  const edges = result.relations.reduce((acc, edge) => {
    const key = `${edge.source}///${edge.target}`;
    acc[key] = {};
    acc[key].weight = edge.weights.map(v => parseFloat(v));
    return acc;
  }, {});
  return { nodes, edges };
};


/**
 * Get current model status and parameterizations
 */
const modelStatus = async (modelId) => {
  Logger.info(`checking dyse model status ${modelId}`);

  const dyseOptions = {
    method: 'GET',
    url: DYSE_URL + '/models/' + modelId,
    headers: {
      'Authorization': basicAuthToken,
      'Content-type': 'application/json',
      'Accept': 'application/json'
    }
  };
  const result = await requestAsPromise(dyseOptions);
  return result;
};

/**
 * Creates an experiment (projection, sensitivity analysis, etc).
 *
 * @param {string} modelId - model identifier
 * @param {object} payload - payload sent in experiment request
 *
 * returns experiment id and status
 */
const createExperiment = async (modelId, payload) => {
  const options = {
    url: DYSE_URL + `/models/${modelId}/experiments`,
    method: 'POST',
    headers: {
      'Authorization': basicAuthToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    json: payload
  };
  const result = await requestAsPromise(options);
  return result;
};

/**
 * Retrieves the result of the projection from DySE via experiment ID
 *
 * @param {string} modelId      - model identifier
 * @param {string} experimentId - external experiment identifier
 */
const findExperiment = async (modelId, experimentId) => {
  const options = {
    url: DYSE_URL + `/models/${modelId}/experiments/${experimentId}`,
    method: 'GET',
    headers: {
      Authorization: basicAuthToken,
      Accept: 'application/json'
    },
    // HACK: This causes DySE to send back properly formatted json in the response. Note that the json option is not meant for this purpose.
    // TODO: Resolve this issue on the DySE side
    json: {}
  };
  const result = await requestAsPromise(options);
  return result;
};


/**
 * Update node parameterization of a model
 *
 * @param {string} modelId - model identifier
 * @param {object} parameter
 */
const updateNodeParameter = async (modelId, parameter) => {
  const options = {
    url: DYSE_URL + `/models/${modelId}/edit-indicators`,
    method: 'POST',
    headers: {
      Authorization: basicAuthToken,
      Accept: 'application/json'
    },
    json: parameter
  };
  const result = await requestAsPromise(options);
  return result;
};


/**
 * Update edge weights
 *
 * @param {string} modelId - model identifier
 * @param {array} edges - [{ source, target, weight} ... ]
 */
const updateEdgeParameter = async (modelId, edges) => {
  const options = {
    url: DYSE_URL + `/models/${modelId}/edit-edges`,
    method: 'POST',
    headers: {
      Authorization: basicAuthToken,
      Accept: 'application/json'
    },
    json: { relations: edges }
  };
  const result = await requestAsPromise(options);
  return result;
};


module.exports = {
  createModel,
  modelStatus,
  createExperiment,
  findExperiment,
  updateNodeParameter,
  updateEdgeParameter
};
