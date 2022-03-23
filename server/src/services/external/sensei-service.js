const _ = require('lodash');
const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');
const auth = rootRequire('/util/auth-util');

const basicAuthToken = auth.getBasicAuthToken(process.env.SENSEI_USERNAME, process.env.SENSEI_PASSWORD);

const DYSE_URL = process.env.SENSEI_URL;

/**
 * Register model on Sensei: sending the id, statements and indicators
 * @param {object} payload
 */
const createModel = async (payload) => {
  Logger.info('Create Sensei model');

  const senseiOptions = {
    method: 'POST',
    url: DYSE_URL + '/create-model',
    headers: {
      'Authorization': basicAuthToken,
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: payload
  };

  const result = await requestAsPromise(senseiOptions);
  if (result.status !== 'success') {
    throw new Error(JSON.stringify(result));
  }

  Logger.warn(JSON.stringify(result.edges, null, 2));

  // Transform result to node/edge initialization maps
  const nodes = result.nodes;
  const edges = result.edges.reduce((acc, edge) => {
    const key = `${edge.source}///${edge.target}`;
    if (!acc[key]) {
      acc[key] = {};
    }
    const w = edge.weights.map(parseFloat);
    acc[key].weights = w.map(v => Math.abs(v));

    // Sensei has polarity values encoded as positive/negative trend weight
    if (+w[1] > 0) {
      acc[key].weights.push(1);
    } else {
      acc[key].weights.push(-1);
    }

    return acc;
  }, {});
  return { nodes, edges, status: result.status };
};


/**
 * Get current model status and parameterizations
 */
const modelStatus = async (modelId) => {
  Logger.info(`checking Sensei model status ${modelId}`);

  const senseiOptions = {
    method: 'GET',
    url: DYSE_URL + '/models/' + modelId,
    headers: {
      'Authorization': basicAuthToken,
      'Content-type': 'application/json',
      'Accept': 'application/json'
    }
  };
  const result = await requestAsPromise(senseiOptions);
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
 * Retrieves the result of the projection from Sensei via experiment ID
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
    json: {}
  };
  const result = await requestAsPromise(options);

  // FIXME: Sensei should just sort timestamps by default for projections
  if (_.isArray(result.results)) {
    result.results.forEach(nodeResult => {
      nodeResult.values = _.orderBy(nodeResult.values, d => d.timestamp);
    });
  }
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
    url: DYSE_URL + `/models/${modelId}/edit-nodes`,
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
 * @param {array} edges - [{ source, target, weights} ... ]
 */
const updateEdgeParameter = async (modelId, edges) => {
  const options = {
    url: DYSE_URL + `/models/${modelId}/edit-edges`,
    method: 'POST',
    headers: {
      Authorization: basicAuthToken,
      Accept: 'application/json'
    },
    json: { edges: edges }
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
