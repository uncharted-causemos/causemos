import _ from 'lodash';
import API from '@/api/api';
import { CODE_TABLE } from '@/utils/code-util';
import { conceptShortName } from '@/utils/concept-util';
import { startPolling } from '@/api/poller';

const MODEL_STATUS = {
  UNSYNCED: 0,
  TRAINING: 1,
  READY: 2
};

const getProjectModels = async (projectId) => {
  const result = await API.get('models', { params: { project_id: projectId, size: 200 } });
  return result.data;
};

/**
 * Get basic model information without underyling data
 */
const getSummary = async (modelId) => {
  const result = await API.get(`models/${modelId}`);
  return result.data;
};

/**
 * Get model data
 */
const getComponents = async (modelId) => {
  const result = await API.get(`cags/${modelId}/components`);
  return result.data;
};

/**
 * GET model status on the engine
 */
const checkAndUpdateRegisteredStatus = async (modelId, engine) => {
  const result = await API.get(`models/${modelId}/registered-status`, { params: { engine: engine } });
  return result.data;
};

/**
 * Synchronize model state with given modeling engine
 */
const syncModelWithEngine = async (modelId, engine) => {
  const result = await API.post(`models/${modelId}/register`, { engine });
  return result.data;
};

/**
 * Get model's scenarios, including baseline scenario
 */
const getScenarios = async (modelId, engine) => {
  const result = await API.get('scenarios', {
    params: { model_id: modelId, engine: engine }
  });
  return result.data;
};

/**
 * Update graph node
 */
const updateNodeParameter = async (modelId, nodeParameter) => {
  const result = await API.post(`models/${modelId}/node-parameter`, nodeParameter);
  return result.data;
};

/**
 * Update graph edge
 */
const updateEdgeParameter = async (modelId, edgeParameter) => {
  const result = await API.post(`models/${modelId}/edge-parameter`, edgeParameter);
  return result.data;
};

const updateModelMetadata = async (modelId, fields) => {
  const result = await API.put(`models/${modelId}/model-metadata`, fields);
  return result.data;
};

const updateModelParameter = async (modelId, modelParameter) => {
  const result = await API.put(`models/${modelId}/model-parameter`, modelParameter);
  return result.data;
};


const updateEdgePolarity = async (modelId, edgeId, polarity) => {
  const result = await API.put(`cags/${modelId}/edge-polarity`, { edge_id: edgeId, polarity });
  return result.data;
};

const recalculate = async (modelId) => {
  await API.post(`cags/${modelId}/recalculate`);
};

const addComponents = async (modelId, nodes, edges) => {
  const result = await API.put(`cags/${modelId}/components`, { operation: 'update', nodes, edges });
  return result.data;
};

const removeComponents = async (modelId, nodes, edges) => {
  const result = await API.put(`cags/${modelId}/components`, { operation: 'remove', nodes, edges });
  return result.data;
};

const removeModel = async (modelId) => {
  const result = await API.delete(`models/${modelId}`);
  return result.data;
};

const duplicateModel = async (modelId) => {
  const result = await API.post(`cags/${modelId}`);
  return result.data;
};

const newModel = async (projectId, name = 'untitled') => {
  const result = await API.post('models', {
    project_id: projectId,
    name: name,
    nodes: [],
    edges: []
  });
  return result.data;
};

// This sets the default indicators for each node in the model
const quantifyModelNodes = async (modelId) => {
  const result = await API.post(`models/${modelId}`);
  return result.data;
};


/**
 * Get statement data backing an edge
 * @param {string} modelId
 * @param {string} source - source concept
 * @param {string} target - target concept
 */
const getEdgeStatements = async (modelId, source, target) => {
  const result = await API.get(`cags/${modelId}/edge-statements`, {
    params: {
      source: source,
      target: target
    }
  });
  return result.data;
};

const getNodeStatements = async (modelId, concept) => {
  const result = await API.get(`cags/${modelId}/node-statements`, {
    params: {
      concept: concept
    }
  });
  return result.data;
};


/**
 * Create/save a scenario
 *
 * @param {object} scenario
 * @param {string} scenario.modelId - modelId
 * @param {string} scenario.engine - which engine this scenario targets
 * @param {string} scenario.name
 * @param {string} scenario.description
 * @param {object} scenario.parameter
 * @param {array} scenario.paramter.constraints - [ {step, value}, {step, value} ... ]
 * @param {number} scenario.paramter.num_steps - number of projection steps
 *
 * With experiment result, additionally
 * @param {string} scenario.experimentId - the identifier used ty the engine
 * @param {array} result - array of projections, one per node in the model graph
 */
const createScenario = async (scenario) => {
  const result = await API.post('scenarios', scenario);
  return result.data;
};
const updateScenario = async (scenario) => {
  const result = await API.put(`scenarios/${scenario.id}`, scenario);
  return result.data;
};
const deleteScenario = async (scenario) => {
  const result = await API.delete(`scenarios/${scenario.id}`, scenario);
  return result.data;
};

// Business logic

/**
 * Ensure the model is in a good state to run experiments, or return with
 * errors
 *
 * @param {string} modelId - model/cag identifier
 */
const DEFAULT_ENGINE = 'dyse';
const initializeModel = async (modelId) => {
  const model = await getSummary(modelId);
  const engine = model.parameter.engine || DEFAULT_ENGINE;
  const errors = [];

  if (model.is_stale === true) {
    errors.push('Model is stale');
  }
  if (model.is_quantified === false) {
    errors.push('Model is not quantified');
  }
  if (!_.isEmpty((errors))) {
    return errors;
  }

  // Model is not synced with the engine, initiate registeration request
  if (model.status === MODEL_STATUS.UNSYNCED) {
    try {
      const r = await syncModelWithEngine(modelId, engine);
      if (r.status === MODEL_STATUS.TRAINING) {
        errors.push('Model training is in progress, please check back in a few minutes');
      }
    } catch (error) {
      errors.push(error.response.data);
    }
    return errors;
  }

  // Model is still training, check and upate the status
  if (model.status === MODEL_STATUS.TRAINING) {
    const r = await checkAndUpdateRegisteredStatus(modelId, engine);
    if (r === MODEL_STATUS.TRAINING) {
      errors.push('Model training is in progress, please check back in a few minutes');
    }
    return errors;
  }
  return [];
};


/**
 * Runs projection experiment
 *
 * @param {string} modelId - model identifier
 * @param {array} constraints - [ {step, value}, { step, value} ...]
 * @param {number} steps - number of steps to project
 */
const runProjectionExperiment = async (modelId, steps, constraints) => {
  const model = await getSummary(modelId);
  const result = await API.post(`models/${modelId}/projection`, {
    engine: model.parameter.engine,
    parameters: constraints,
    numTimeSteps: steps,
    projectionStart: model.parameter.projection_start
  });
  return result.data.experimentId;
};


/**
 * Poll for experiment
 *
 * @param {string} modelId - model identifier
 * @param {string} experimentId - eperiment id/hash
 * @param {number} threshold - optional, number of times to poll
 */
const getExperimentResult = async (modelId, experimentId, threshold = 10) => {
  const model = await getSummary(modelId);
  const taskFn = async () => {
    const { data } = await API.get(`models/${modelId}/experiments`, { params: { engine: model.parameter.engine, experiment_id: experimentId } });
    return _.isEmpty(data.results) ? [false, null] : [true, data];
  };

  return startPolling(taskFn, {
    interval: 3000,
    threshold: threshold
  });
};


/**
 * Build the data structure to render a historical/projection graph
 *
 * @param {object} modelSummary - model summary data
 * @param {array} node-parameter components
 * @param {array} scenarios - array of scenario objects
 */
const buildNodeChartData = (modelSummary, nodes, scenarios) => {
  const result = {};
  const modelParameter = modelSummary.parameter;

  const getScenarioConstraints = (scenario, concept) => {
    if (_.isEmpty(scenario.parameter)) return [];

    const constraints = scenario.parameter.constraints.find(d => d.concept === concept);
    return _.isNil(constraints) ? [] : constraints.values;
  };

  const getScenarioResult = (scenario, concept) => {
    const result = scenario.result.find(d => d.concept === concept);

    // Scenario may be stale/invalid
    if (!result) {
      return {};
    }

    return {
      values: result.values,
      confidenceInterval: result.confidenceInterval
    };
  };

  nodes.forEach(nodeData => {
    const graphData = {};

    // 1. indicator and model information
    const indicatorData = nodeData.parameter || {};
    const concept = nodeData.concept;

    graphData.initial_value = indicatorData.initial_value;
    graphData.indicator_name = indicatorData.indicator_name || null;
    graphData.indicator_time_series = indicatorData.indicator_time_series || [];
    graphData.indicator_time_series_range = {
      start: modelParameter.indicator_time_series_range.start,
      end: modelParameter.indicator_time_series_range.end
    };
    graphData.projection_start = modelParameter.projection_start;

    graphData.scenarios = [];

    // 2. grab relevant data for this node from each scenario, if applicable
    scenarios.forEach(scenario => {
      const scenarioData = {};
      scenarioData.id = scenario.id;
      scenarioData.is_baseline = scenario.is_baseline;
      scenarioData.is_valid = scenario.is_valid;
      scenarioData.parameter = scenario.parameter;
      scenarioData.name = scenario.name;
      scenarioData.constraints = getScenarioConstraints(scenario, concept);
      scenarioData.result = getScenarioResult(scenario, concept);
      graphData.scenarios.push(scenarioData);
    });

    result[concept] = graphData;
  });
  return result;
};


/**
 * Find suggested concepts for the specified string
 *
 * @param {string} projectId
 * @param {string} queryString - string to use to get suggestions
 * @param {array} ontology - array of all the concepts in the ontology
 */
const getConceptSuggestions = async (projectId, queryString, ontology) => {
  const subjPromise = getSuggestions(projectId, CODE_TABLE.SUBJ_CONCEPT.field, queryString);
  const objPromise = getSuggestions(projectId, CODE_TABLE.OBJ_CONCEPT.field, queryString);
  const results = await Promise.all([subjPromise, objPromise]);

  const evidenceSuggestions = _.union(results[0], results[1])
    .map(_markConceptHasEvidence(true));
  const ontologySuggestions = ontology.map(_markConceptHasEvidence(false))
    .filter(concept => concept.shortName.indexOf(queryString) > -1);

  const suggestions = _.unionBy(evidenceSuggestions, ontologySuggestions, 'shortName');
  return suggestions;
};

const _markConceptHasEvidence = (hasEvidence) =>
  function(concept) {
    return {
      concept,
      hasEvidence,
      shortName: conceptShortName(concept)
    };
  };


/**
 * Find suggested terms for the specified string, looking in the provided field
 *
 * @param {string} projectId
 * @param {string} field - field which should be searched
 * @param {string} queryString - string to use to get suggestions
 */
const getSuggestions = async (projectId, field, queryString) => {
  const { data } = await API.get(`projects/${projectId}/suggestions`, { params: { field, q: queryString } });
  return data;
};

/**
 * Constructs and sends a request for a new sensitivity analysis
 *
 * @param {object} modelSummary - contains the model's ID and configuration settings
 * @param {object} modelComponents - contains the nodes and edges that make up the model
 * @param {string} analysisType - one of 'IMMEDIATE', 'GLOBAL', or 'PATHWAYS'
 * @param {string} analysisMode - either 'STATIC' or 'DYNAMIC'
 * @param {array} constraints - a list of constraints that have been set in the current scenario
 * @returns {string} - the experiment ID that can be polled for the results
 */
const runSensitivityAnalysis = async (
  modelSummary,
  analysisType,
  analysisMode,
  constraints
) => {
  const { id: modelId } = modelSummary;
  const { engine, num_steps: numTimeSteps, projection_start: experimentStart } = modelSummary.parameter;

  const analysisParams = {
    numPath: 0,
    pathAtt: '', // FIXME: these should be passed in but they are only relevant when
    source: [], // analysisType === 'PATHWAYS' (for pathAtt), and when you don't want
    target: [] // to run the analysis on the whole graph (for source/target)
  };

  const result = await API.post(
    `models/${modelId}/sensitivity-analysis`,
    {
      analysisMode,
      analysisParams,
      analysisType,
      constraints,
      engine,
      experimentStart,
      numTimeSteps
    }
  );

  return result.data.experimentId;
};


/**
 * Adjust scenario parameters to adapt to model settings.
 *
 * @param {object} scenario - scenario to modify
 * @param {object} modelSummary - model info
 * @param {array} nodeParameter - model's nodes
 */
const resetScenarioParameter = (scenario, modelSummary, nodeParameters) => {
  const modelParameter = modelSummary.parameter;
  const concepts = nodeParameters.map(n => n.concept);

  // Remove constraints if the concept is no longer in the model
  _.remove(scenario.parameter.constraints, constraint => {
    return !concepts.includes(constraint.concept);
  });

  // Remove individual clamps if they fall outside of the available range
  scenario.parameter.constraints.forEach(constraints => {
    _.remove(constraints.values, v => {
      return v.step >= modelParameter.num_steps;
    });
  });

  // Reset time ranges
  scenario.parameter.indicator_time_series_range = modelParameter.indicator_time_series_range;
  scenario.parameter.projection_start = modelParameter.projection_start;
  scenario.parameter.num_steps = modelParameter.num_steps;
  return scenario;
};


export default {
  getProjectModels,
  getSummary,
  checkAndUpdateRegisteredStatus,
  getComponents,
  getEdgeStatements,
  getNodeStatements,

  initializeModel,
  runProjectionExperiment,
  runSensitivityAnalysis,
  getExperimentResult,

  getScenarios,
  createScenario,
  updateScenario,
  deleteScenario,
  resetScenarioParameter,

  updateNodeParameter,
  updateModelParameter,
  updateModelMetadata,
  updateEdgeParameter,
  updateEdgePolarity,
  recalculate,
  addComponents,
  removeComponents,
  removeModel,
  duplicateModel,
  newModel,
  quantifyModelNodes,

  buildNodeChartData,

  getSuggestions,
  getConceptSuggestions
};
