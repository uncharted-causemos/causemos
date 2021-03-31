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
  // if (result.status !== 'success') {
  //   throw new Error(JSON.stringify(result));
  // }
  return result;
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


module.exports = {
  createModel,
  modelStatus,
  createProjection,
  findExperiment
};
