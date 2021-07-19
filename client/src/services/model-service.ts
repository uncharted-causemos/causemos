import _ from 'lodash';
import API from '@/api/api';
import { CODE_TABLE } from '@/utils/code-util';
import { conceptShortName } from '@/utils/concept-util';
import { startPolling } from '@/api/poller';
import {
  Scenario,
  ScenarioConstraint,
  NodeParameter,
  EdgeParameter,
  CAGModelSummary,
  CAGGraph,
  ScenarioResult
} from '@/types/CAG';

const MODEL_STATUS = {
  UNSYNCED: 0,
  TRAINING: 1,
  READY: 2
};

const MODEL_MSG_RETRAINING_INFO = 'Model training is in progress, please check back in a few minutes';
export const MODEL_MSG_RETRAINING_BLOCK = 'Model training is in progress, please wait...';

const getProjectModels = async (projectId: string): Promise<{ models: CAGModelSummary[]; size: number; from: number }> => {
  const result = await API.get('models', { params: { project_id: projectId, size: 200 } });
  return result.data;
};

/**
 * Get basic model information without underyling data
 */
const getSummary = async (modelId: string) => {
  const result = await API.get(`models/${modelId}`);
  return result.data;
};

/**
 * Get model data
 */
const getComponents = async (modelId: string) => {
  const result = await API.get(`cags/${modelId}/components`);
  return result.data;
};

/**
 * GET model status on the engine
 */
const checkAndUpdateRegisteredStatus = async (modelId: string, engine: string) => {
  const result = await API.get(`models/${modelId}/registered-status`, { params: { engine: engine } });
  return result.data;
};

/**
 * Synchronize model state with given modeling engine
 */
const syncModelWithEngine = async (modelId: string, engine: string) => {
  const result = await API.post(`models/${modelId}/register`, { engine });
  return result.data;
};

/**
 * Get model's scenarios, including baseline scenario
 */
const getScenarios = async (modelId: string, engine: string) => {
  const result = await API.get('scenarios', {
    params: { model_id: modelId, engine: engine }
  });
  return result.data;
};

/**
 * Update graph node
 */
const updateNodeParameter = async (modelId: string, nodeParameter: NodeParameter) => {
  const result = await API.post(`models/${modelId}/node-parameter`, nodeParameter);
  return result.data;
};

/**
 * Update graph edge
 */
const updateEdgeParameter = async (modelId: string, edgeParameter: EdgeParameter) => {
  const result = await API.post(`models/${modelId}/edge-parameter`, edgeParameter);
  return result.data;
};

const updateModelMetadata = async (modelId: string, fields: { [key: string]: any }) => {
  const result = await API.put(`models/${modelId}/model-metadata`, fields);
  return result.data;
};

const updateModelParameter = async (modelId: string, modelParameter: NodeParameter) => {
  const result = await API.put(`models/${modelId}/model-parameter`, modelParameter);
  return result.data;
};


const updateEdgePolarity = async (modelId: string, edgeId: string, polarity: number) => {
  const result = await API.put(`cags/${modelId}/edge-polarity`, { edge_id: edgeId, polarity });
  return result.data;
};

const recalculate = async (modelId: string) => {
  await API.post(`cags/${modelId}/recalculate`);
};

const addComponents = async (modelId: string, nodes: NodeParameter[], edges: EdgeParameter[]) => {
  const result = await API.put(`cags/${modelId}/components`, { operation: 'update', nodes, edges });
  return result.data;
};

const removeComponents = async (modelId: string, nodes: { id: string }[], edges: { id: string }[]) => {
  const result = await API.put(`cags/${modelId}/components`, { operation: 'remove', nodes, edges });
  return result.data;
};

const removeModel = async (modelId: string) => {
  const result = await API.delete(`models/${modelId}`);
  return result.data;
};

const duplicateModel = async (modelId: string) => {
  const result = await API.post(`cags/${modelId}`);
  return result.data;
};

const newModel = async (projectId: string, name = 'untitled') => {
  const result = await API.post('models', {
    project_id: projectId,
    name: name,
    nodes: [],
    edges: []
  });
  return result.data;
};

// This sets the default indicators for each node in the model
const quantifyModelNodes = async (modelId: string) => {
  const result = await API.post(`models/${modelId}`);
  return result.data;
};


/**
 * Get statement data backing an edge
 * @param {string} modelId
 * @param {string} source - source concept
 * @param {string} target - target concept
 */
const getEdgeStatements = async (modelId: string, source: string, target: string) => {
  const result = await API.get(`cags/${modelId}/edge-statements`, {
    params: {
      source: source,
      target: target
    }
  });
  return result.data;
};

const getNodeStatements = async (modelId: string, concept: string) => {
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
const createScenario = async (scenario: Scenario) => {
  const result = await API.post('scenarios', scenario);
  return result.data;
};
const updateScenario = async (scenario: Scenario) => {
  const result = await API.put(`scenarios/${scenario.id}`, scenario);
  return result.data;
};
const deleteScenario = async (scenario: Scenario) => {
  const result = await API.delete(`scenarios/${scenario.id}`);
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
const initializeModel = async (modelId: string) => {
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
        errors.push(MODEL_MSG_RETRAINING_INFO);
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
      errors.push(MODEL_MSG_RETRAINING_INFO);
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
const runProjectionExperiment = async (
  modelId: string,
  steps: number,
  constraints: ScenarioConstraint[]) => {
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
const getExperimentResult = async (modelId: string, experimentId: string, threshold = 30) => {
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
const buildNodeChartData = (modelSummary: CAGModelSummary, nodes: NodeParameter[], scenarios: Scenario[]) => {
  const result: any = {};
  const modelParameter = modelSummary.parameter;

  const getScenarioConstraints = (scenario: Scenario, concept: string) => {
    if (_.isEmpty(scenario.parameter) || _.isNil(scenario.parameter)) return [];

    const constraints = scenario.parameter.constraints.find(d => d.concept === concept);
    return _.isNil(constraints) ? [] : constraints.values;
  };

  const getScenarioResult = (scenario: Scenario, concept: string) => {
    if (!scenario.result) return {};

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

  // FIXME: types
  nodes.forEach(nodeData => {
    const graphData: any = {};

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
      const scenarioData: any = {};
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
const getConceptSuggestions = async (projectId: string, queryString: string, ontology: string[]) => {
  const subjPromise = getSuggestions(projectId, CODE_TABLE.SUBJ_CONCEPT.field, queryString);
  const objPromise = getSuggestions(projectId, CODE_TABLE.OBJ_CONCEPT.field, queryString);
  const results: [string[], string[]] = await Promise.all([subjPromise, objPromise]);

  const evidenceSuggestions = _.union(results[0], results[1])
    .map(_markConceptHasEvidence(true));
  const ontologySuggestions = ontology.map(_markConceptHasEvidence(false))
    .filter(concept => concept.shortName.indexOf(queryString) > -1);

  const suggestions = _.unionBy(evidenceSuggestions, ontologySuggestions, 'shortName');
  return suggestions;
};

const _markConceptHasEvidence = (hasEvidence: boolean) =>
  function(concept: string) {
    return {
      concept,
      hasEvidence,
      shortName: conceptShortName(concept) || '',
      label: ''
    };
  };


/**
 * Find suggested terms for the specified string, looking in the provided field
 * FIXME: Not model related, move out
 *
 * @param {string} projectId
 * @param {string} field - field which should be searched
 * @param {string} queryString - string to use to get suggestions
 */
const getSuggestions = async (projectId: string, field: string, queryString: string) => {
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
  modelSummary: CAGModelSummary,
  analysisType: string,
  analysisMode: string,
  constraints: ScenarioConstraint[]
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
const resetScenarioParameter = (scenario: Scenario, modelSummary: CAGModelSummary, nodeParameters: NodeParameter[]) => {
  const modelParameter = modelSummary.parameter;
  const concepts = nodeParameters.map(n => n.concept);

  if (!scenario.parameter) return scenario;

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


/**
 * Merge cagB into cagA. Note this will modify cagA in-place.
 *
 * @param {object} cagA - CAG with edges/nodes
 * @param {object} cagB - CAG with edges/nodes
 * @param {boolean} overwriteParameterization
 */
export const mergeCAG = (cagA: CAGGraph, cagB: CAGGraph, overwriteParameterization: boolean) => {
  // Merge nodes from cagA
  cagB.nodes.forEach(node => {
    const targetNode = cagA.nodes.find(d => d.concept === node.concept);
    if (_.isNil(targetNode)) {
      cagA.nodes.push({
        id: '',
        concept: node.concept,
        label: node.label,
        parameter: node.parameter
      });
    } else {
      if (overwriteParameterization === true) {
        targetNode.parameter = node.parameter;
      }
    }
  });

  // Merge edges from cagB
  cagB.edges.forEach(edge => {
    let targetEdge = null;
    targetEdge = cagA.edges.find(d => d.source === edge.source && d.target === edge.target);

    if (!_.isNil(targetEdge)) {
      targetEdge.reference_ids = _.uniq(targetEdge.reference_ids.concat(edge.reference_ids));
      if (overwriteParameterization === true) {
        targetEdge.parameter = edge.parameter;
      }

      const targetHasUserPolarity = !_.isNil(targetEdge.user_polarity);
      const sourceHasUserPolarity = !_.isNil(edge.user_polarity);
      if (targetHasUserPolarity) {
        if (sourceHasUserPolarity && edge.user_polarity !== targetEdge.user_polarity) {
          // if there is a user_polarity conflict, reset the field as blank so the user must re-review the edge
          targetEdge.user_polarity = null;
        }
      } else if (!targetHasUserPolarity && sourceHasUserPolarity) {
        // if there isn't a conflict, just copy the user_polarity value over
        targetEdge.user_polarity = edge.user_polarity;
      }
    } else {
      cagA.edges.push({
        id: '',
        source: edge.source,
        target: edge.target,
        reference_ids: edge.reference_ids,
        user_polarity: edge.user_polarity,
        parameter: edge.parameter
      });
    }
  });
};


/**
 * A quick check to see if there are conflicting node-parameter information.
 * Short circuit returning true if a conflict can be found.
 *
 * @param {object} currentCAG
 * @param {array} array of cag objects
 */
export const hasMergeConflictNodes = (currentCAG: CAGGraph, importCAGs: CAGGraph[]) => {
  for (let i = 0; i < currentCAG.nodes.length; i++) {
    const node = currentCAG.nodes[i];
    for (let j = 0; j < importCAGs.length; j++) {
      const importCAG = importCAGs[j];
      const importNode = importCAG.nodes.find(n => n.concept === node.concept);

      // If encounter the same concept, check if the parameterzation is the same
      if (importNode && !_.isEqual(importNode.parameter, node.parameter)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * A quick check to see if there are conflicting edge-parameter information.
 * Short circuit returning true if a conflict can be found.
 *
 * @param {object} currentCAG
 * @param {array} array of cag objects
 */
export const hasMergeConflictEdges = (currentCAG: CAGGraph, importCAGs: CAGGraph[]) => {
  for (let i = 0; i < currentCAG.edges.length; i++) {
    const edge = currentCAG.edges[i];
    for (let j = 0; j < importCAGs.length; j++) {
      const importCAG = importCAGs[j];
      const importEdge = importCAG.edges.find(e => e.source === edge.source && e.target === edge.target);

      // If encounter the same concept, check if the parameterization is the same
      if (importEdge && (!_.isEqual(importEdge.parameter, edge.parameter) || !_.isEqual(importEdge.polarity, edge.polarity))) {
        return true;
      }
    }
  }
  return false;
};

export const ENGINE_OPTIONS = [
  { key: 'dyse', value: 'DySE', maxSteps: 72 },
  { key: 'delphi', value: 'Delphi', maxSteps: 36 }
];

export const calculateScenarioPercentageChange = (experiment: ScenarioResult, initValue: number) => {
  // We just calculate the percent change when: 1) when initial and last value are the same sign; and 2) initial value is not 0
  // We will be asking users about utility of this percent change

  // When dealing with dyse, we can calculate the percentage using:
  // 1. the intial value, which is in turn based on time series data
  // 2. the clamp that the user set at t0, which is by default the initial value if the user hasn't set a clamp at t0
  // We've opted to use option 2
  const last = _.last(experiment.values);
  const lastValue = last ? last.value : 0;

  if ((initValue * lastValue > 0)) {
    return ((lastValue - initValue) / Math.abs(initValue)) * 100; // %Delta = (C-P)/|P
  } else {
    return 0.0;
  }
};


// Dyse projections previously could not exlend above/below historic min/max, this code fixs that by placing the historic data into the middle third of the levels, adding space
// above and below historic min/max so that Dyse CAN project above/below the historic min/max.
// the padding above and below is equal to the range between min and max.  There's some tweaking to make it work with numLevels.

export const expandExtentForDyseProjections = (yExtent: [number, number], numLevels: number) => {
  const scalingFactor = ((yExtent[1] - yExtent[0]) / ((1 / 3.0) * (numLevels - 1)));
  const averageExtent = 0.5 * (yExtent[0] + yExtent[1]);
  const dyseOffset = 0.25 * ((numLevels + 1) % 2);

  return [
    -scalingFactor * Math.floor(0.5 * numLevels) + averageExtent + dyseOffset,
    scalingFactor * (Math.ceil(0.5 * numLevels) - 1) + averageExtent + dyseOffset
  ];
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
  getConceptSuggestions,

  mergeCAG,
  hasMergeConflictNodes,
  hasMergeConflictEdges,

  calculateScenarioPercentageChange,
  expandExtentForDyseProjections,
  ENGINE_OPTIONS,
  MODEL_MSG_RETRAINING_BLOCK
};
