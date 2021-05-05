const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');

/**
 * Return all model runs belonging to a model
 *
 * @param{string} modelId - model id
 */
const getAllModelRuns = async(modelId) => {
  const connection = Adapter.get(RESOURCE.MODEL_RUNS);
  const results = await connection.find([{ field: 'model_id', value: modelId }], { size: SEARCH_LIMIT });
  return results;
};

module.exports = {
  getAllModelRuns
};
