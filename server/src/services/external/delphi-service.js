const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');
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
  if (result.status !== 'success') {
    throw new Error(JSON.stringify(result));
  }

  // FIXME: return relevant initial values
  return {
    nodes: {},
    edges: {}
  };
};

/**
 * Creates a projection experiment of each indicator with estimation bounds.
 *
 * @param {string} modelId - model identifier
 * @param {object} payload - payload sent in projection request
 *
 * returns experiment id and status
 */
const createProjection = async (modelId, payload) => {
  const options = {
    url: process.env.DELPHI_URL + `/delphi/models/${modelId}/projection`,
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
    url: process.env.DELPHI_URL + `/delphi/models/${modelId}/experiment/${experimentId}`,
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

/**
 * Retrieves model parameters and model status (if ready or not)
 */
const modelStatus = async (modelId) => {
  const options = {
    url: process.env.DELPHI_URL + `/delphi/models/${modelId}`,
    method: 'GET',
    headers: {
      Accept: 'application/json'
    },
    json: {}
  };
  const result = await requestAsPromise(options);
  return result;
};

module.exports = {
  createModel,
  createProjection,
  findExperiment,
  modelStatus
};
