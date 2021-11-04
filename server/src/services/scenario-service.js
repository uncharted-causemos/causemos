const _ = require('lodash');
const { v4: uuid } = require('uuid');
const Logger = rootRequire('/config/logger');

const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');

/**
 *  Find scenarios by model and engine
 * @param {string} modelId
 * @param {object} options - additiona options for ES search
 */
const find = async(modelId, options) => {
  const scenarioConnection = Adapter.get(RESOURCE.SCENARIO);
  const scenarios = await scenarioConnection.find([{ field: 'model_id', value: modelId }], options);
  return scenarios;
};

/**
 *  Find a scenario by id
 * @param {string} scenarioId
 */
const findOne = async(scenarioId) => {
  const scenarioConnection = Adapter.get(RESOURCE.SCENARIO);
  const scenario = await scenarioConnection.findOne([{ field: 'id', value: scenarioId }], {});
  return scenario;
};

/**
 *
 * @param {array} parameter - constraints data
 * @param {string} name - scenario display name
 * @param {string} description - scenario description
 * @param {string} modelId - model id
 * @param {boolean} isBaseline
 */
const createScenario = async ({ parameter, name, description, model_id: modelId, isBaseline }) => {
  const scenarioConnection = Adapter.get(RESOURCE.SCENARIO);
  const id = uuid();

  // Sanity check if there is already a baseline
  if (isBaseline === true) {
    const baseCount = await scenarioConnection.count([
      { field: 'is_baseline', value: true },
      { field: 'model_id', value: modelId }
    ]);

    if (baseCount > 0) {
      throw new Error(`Baseline exists for model ${modelId}`);
    }
  }

  // create payload
  const payload = {
    id,
    name,
    description,
    modified_at: Date.now(),
    model_id: modelId,
    is_baseline: isBaseline
  };

  if (!_.isEmpty(parameter)) {
    payload.parameter = parameter;
  }
  Logger.debug(`Creating a scenario: ${JSON.stringify(payload)}`);

  // insert scenario
  const response = await scenarioConnection.insert(payload, (d) => d.id);
  if (response.errors) {
    throw new Error(JSON.stringify(response.items[0]));
  }

  return { id };
};





/**
 * Update scenario fields
 *
 * @param {string} scenarioId
 * @param {object} payload
 */
const update = async (scenarioId, payload) => {
  Logger.info('Updating scenario:' + scenarioId);
  const scenarioConnection = Adapter.get(RESOURCE.SCENARIO);
  // create payload
  const updatePayload = {
    id: scenarioId,
    modified_at: Date.now(),
    ...payload
  };
  // update scenario
  const result = await scenarioConnection.update(updatePayload, (d) => d.id);
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
  Logger.info('Updated scenario:' + scenarioId);
};

/**
 * Delete scenario by Id
 *
 * @param {string} scenarioId
 */
const remove = async (scenarioId) => {
  Logger.info('Deleting scenario:' + scenarioId);
  const scenarioConnection = Adapter.get(RESOURCE.SCENARIO);
  const result = await scenarioConnection.remove([{ field: 'id', value: scenarioId }]);
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
  if (result.deleted === 0) {
    Logger.info(`Scenario with id ${scenarioId} could not be found`);
  } else {
    Logger.info('Deleted scenario:' + scenarioId);
  }
};

const removeAll = async (modelId) => {
  Logger.info('Deleting scenario for model with id:' + modelId);
  const scenarioConnection = Adapter.get(RESOURCE.SCENARIO);
  const result = await scenarioConnection.remove([{ field: 'model_id', value: modelId }]);
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }

  Logger.info('Deleted number of scenarios:' + result.deleted);
};


// Mark scenario results under modelid as invalid
const invalidateByModel = async(modelId) => {
  Logger.info('Invalidate scenario for model with id:' + modelId);

  const scenarioResultConnection = Adapter.get(RESOURCE.SCENARIO_RESULT);

  // FIXME exclude results for smaller payload
  const scenarios = await scenarioResultConnection.find([{ field: 'model_id', value: modelId }], {});

  // Nothing to do
  if (scenarios.length === 0) return;

  const updatePayload = scenarios.map(s => {
    return {
      id: s.id,
      is_valid: false
    };
  });

  // update scenario
  const result = await scenarioResultConnection.update(updatePayload, d => d.id);
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
};

const createScenarioResult = async (
  modelId,
  scenarioId,
  engine,
  experimentId,
  resultData
) => {
  const scenarioResultConnection = Adapter.get(RESOURCE.SCENARIO_RESULT);

  const payload = {
    id: `${scenarioId}-${engine}`,
    engine: engine,
    is_valid: true,
    experiment_id: experimentId,
    result: resultData
  };
  await scenarioResultConnection.insert([payload], d => d.id);
};

const findResults = async (modelId, engine) => {
  const scenarioResultConnection = Adapter.get(RESOURCE.SCENARIO_RESULT);

  const r = await scenarioResultConnection.find(
    [{ field: 'model_id', value: modelId }],
    { size: 100 }
  );
  return r;
};


module.exports = {
  find,
  findOne,
  createScenario,
  update,
  remove,
  removeAll,

  createScenarioResult,
  findResults,

  invalidateByModel
};
