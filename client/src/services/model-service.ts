import _ from 'lodash';
import API from '@/api/api';
import { CODE_TABLE } from '@/utils/code-util';
import { conceptShortName } from '@/utils/concept-util';
import { startPolling } from '@/api/poller';
import {
  Scenario,
  ConceptProjectionConstraints,
  NewScenario,
  NodeParameter,
  EdgeParameter,
  CAGModelSummary,
  CAGGraph,
  ScenarioResult,
  NodeScenarioData,
  ScenarioParameter
} from '@/types/CAG';

const MODEL_STATUS = {
  UNSYNCED: 0,
  TRAINING: 1,
  READY: 2
};


const MODEL_MSGS = {
  MODEL_STALE: 'Model is stale',
  MODEL_TRAINING: 'Model training is in progress, please check back in a few minutes'
};

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
 * Get the number of edges and nodes for each model passed in
 */
const getModelStats = async (modelIds: Array<string>) => {
  const result = await API.get('models/model-stats', { params: { modelIds: modelIds } });
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

const addComponents = async (modelId: string, nodes: NodeParameter[], edges: EdgeParameter[], updateType = '') => {
  const result = await API.put(`cags/${modelId}/components`, { operation: 'update', nodes, edges, updateType });
  return result.data;
};

const removeComponents = async (modelId: string, nodes: { id: string }[], edges: { id: string }[]) => {
  const result = await API.put(`cags/${modelId}/components`, { operation: 'remove', nodes, edges });
  return result.data;
};

const addGroups = async (modelId: string, groups: {id: string; children: string[]}[]) => {
  const result = await API.put(`cags/${modelId}/components`, { operation: 'update', groups });
  return result;
};

const removeGroups = async (modelId: string, groups: { id: string }[]) => {
  const result = await API.put(`cags/${modelId}/components`, { operation: 'remove', groups });
  return result;
};

const removeModel = async (modelId: string) => {
  const result = await API.delete(`models/${modelId}`);
  return result.data;
};

const duplicateModel = async (modelId: string, name: string) => {
  const result = await API.post(`cags/${modelId}`, { name });
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
const createScenario = async (scenario: NewScenario) => {
  const result = await API.post('scenarios', scenario);
  return result.data;
};
const updateScenario = async (scenario: {
  id: string;
  model_id: string;
  is_valid: boolean;
  experiment_id: string | undefined;
  parameter?: ScenarioParameter;
  result?: ScenarioResult[];
}) => {
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
    errors.push(MODEL_MSGS.MODEL_STALE);
  }
  // if (model.is_quantified === false) {
  //   errors.push('Model is not quantified');
  // }
  if (!_.isEmpty((errors))) {
    return errors;
  }

  // Model is not synced with the engine, initiate registeration request
  if (model.status === MODEL_STATUS.UNSYNCED) {
    try {
      const r = await syncModelWithEngine(modelId, engine);
      if (r.status === MODEL_STATUS.TRAINING) {
        errors.push(MODEL_MSGS.MODEL_TRAINING);
      }
    } catch (error) {
      errors.push(error.response.data);
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
  constraints: ConceptProjectionConstraints[]) => {
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
const getExperimentResult = async (modelId: string, experimentId: string, threshold = 30, progressFn: (Function | null) = null) => {
  const model = await getSummary(modelId);
  const taskFn = async () => {
    const { data } = await API.get(`models/${modelId}/experiments`, { params: { engine: model.parameter.engine, experiment_id: experimentId } });
    return _.isEmpty(data.results) ? [false, null] : [true, data];
  };

  return startPolling(taskFn, progressFn, {
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
  const result: {[concept: string]: NodeScenarioData} = {};
  const modelParameter = modelSummary.parameter;

  const getConceptProjectionConstraints = (scenario: Scenario, concept: string) => {
    if (_.isEmpty(scenario.parameter) || _.isNil(scenario.parameter)) return [];

    const constraints = scenario.parameter.constraints.find(d => d.concept === concept);
    return _.isNil(constraints) ? [] : constraints.values;
  };

  const getScenarioResult = (scenario: Scenario, concept: string) => {
    if (!scenario.result) return null;

    const result = scenario.result.find(d => d.concept === concept);

    // Scenario may be stale/invalid
    if (!result) {
      return null;
    }

    return {
      values: result.values,
      confidenceInterval: result.confidenceInterval
    };
  };

  nodes.forEach(nodeData => {
    // 1. indicator and model information
    const indicatorData = nodeData.parameter || {};
    const concept = nodeData.concept;

    const graphData: NodeScenarioData = {
      initial_value: indicatorData.initial_value,
      indicator_name: indicatorData.name || '',
      indicator_time_series: indicatorData.timeseries || [],
      indicator_time_series_range: {
        start: modelParameter.indicator_time_series_range.start,
        end: modelParameter.indicator_time_series_range.end
      },
      projection_start: modelParameter.projection_start,
      min: indicatorData.min,
      max: indicatorData.max,
      scenarios: []
    };

    // 2. grab relevant data for this node from each scenario, if applicable
    const scenarioDataForThisNode = scenarios.map(scenario => {
      const { id, is_baseline, is_valid, parameter, name } = scenario;
      return {
        id,
        is_baseline,
        is_valid,
        parameter,
        name,
        constraints: getConceptProjectionConstraints(scenario, concept),
        result: getScenarioResult(scenario, concept) || undefined
      };
    });

    graphData.scenarios = scenarioDataForThisNode;

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
  constraints: ConceptProjectionConstraints[]
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


const createBaselineScenario = async (modelSummary: CAGModelSummary) => {
  const modelId = modelSummary.id;
  const numSteps = modelSummary.parameter.num_steps;
  try {
    const experimentId = await runProjectionExperiment(modelId, numSteps, cleanConstraints([]));
    const result: any = await getExperimentResult(modelId, experimentId, 30);

    const scenario: NewScenario = {
      model_id: modelId,
      experiment_id: experimentId,
      result: result.results.data,
      name: 'Baseline scenario',
      description: 'Baseline scenario',
      parameter: {
        constraints: [],
        num_steps: numSteps,
        indicator_time_series_range: modelSummary.parameter.indicator_time_series_range,
        projection_start: modelSummary.parameter.projection_start
      },
      engine: modelSummary.parameter.engine,
      is_baseline: true
    };
    await createScenario(scenario);
  } catch (error) {
    console.log(error);
    throw new Error(`Failed creating baseline scenario ${modelSummary.parameter.engine}`);
  }
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


// Cleanse constraint payload
const cleanConstraints = (constraints: ConceptProjectionConstraints[]) => {
  const result = _.cloneDeep(constraints);

  // Reorder by step ascending order - FIXME: Check with DySE if we still need this - Sep 2021
  result.forEach(r => {
    r.values = _.orderBy(r.values, v => v.step);
  });

  // Remove concepts with empty constraints
  return result.filter(d => {
    return !_.isEmpty(d.values);
  });
};

export default {
  getProjectModels,
  getSummary,
  checkAndUpdateRegisteredStatus,
  getComponents,
  getModelStats,
  getEdgeStatements,
  getNodeStatements,

  initializeModel,
  runProjectionExperiment,
  runSensitivityAnalysis,
  getExperimentResult,
  createBaselineScenario,

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
  addGroups,
  removeGroups,
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
  cleanConstraints,

  ENGINE_OPTIONS,
  MODEL_STATUS,
  MODEL_MSGS
};
