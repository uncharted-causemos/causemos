const requestAsPromise = rootRequire('/util/request-as-promise');
const Logger = rootRequire('/config/logger');

const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');

/**
 * Return all model runs belonging to a model
 *
 * @param{string} modelId - model id
 */
const getAllModelRuns = async(modelId) => {
  console.log('Getting all model runs for ' + modelId);
  const connection = Adapter.get(RESOURCE.MODEL_RUNS);
  const results = await connection.find([{ field: 'model_id', value: modelId }], { size: SEARCH_LIMIT });
  return results;
};

module.exports = {
  getAllModelRuns
};
