const _ = require('lodash');
const moment = require('moment');
const Logger = rootRequire('/config/logger');

const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');
const modelUtil = rootRequire('/util/model-util');

const DEFAULT_BATCH_SIZE = 1000;
const MODEL_STATUS = modelUtil.MODEL_STATUS;
const RESET_ALL_ENGINE_STATUS = modelUtil.RESET_ALL_ENGINE_STATUS;


// Type of experiment that can be performed in modeling Engine
const EXPERIMENT_TYPE = Object.freeze({
  PROJECTION: 'PROJECTION',
  SENSITIVITY_ANALYSIS: 'SENSITIVITY_ANALYSIS',
  GOAL_OPTIMIZATION: 'GOAL_OPTIMIZATION'
});

const NUM_LEVELS = 31; // For y-scaling (1 + 6*N)

/**
 * Get all models
 *
 * @param {object} projectId - models from this project will be returned
 * @param {object} size - number of models returned
 * @param {object} from - offset for paginated results
 * @param {object} sort - results sort field - {field: order} object, e.g. [{field1: 'asc'}, {field2: 'desc'}]
 */
const find = (projectId, size, from, sort) => {
  const modelsConnection = Adapter.get(RESOURCE.MODEL);
  if (_.isNil(size)) size = 20;
  if (_.isNil(sort)) sort = { modified_at: 'desc' };
  return modelsConnection.find([{ field: 'project_id', value: projectId }], { size, from, sort });
};

/**
 * Get one models
 *
 * @param {string} modelId - models from this project will be returned
 */
const findOne = async (modelId) => {
  const modelAdapter = Adapter.get(RESOURCE.MODEL);
  const model = modelAdapter.findOne([{ field: 'id', value: modelId }], {
    excludes: ['thumbnail_source']
  });

  return model;
};

/**
 * Get the number of Edges and Nodes for each model passed in
 *
 * @param {Array<String>} modelIDs - a list of model ID's for which stats will be returned for
 */
const getModelStats = async (modelIDs) => {
  const dict = {};

  const nodesAdapter = Adapter.get(RESOURCE.NODE_PARAMETER);
  const nodeResult = await nodesAdapter.getFacets('model_id', [
    {
      field: 'model_id',
      value: modelIDs
    }
  ]);

  nodeResult.forEach(pair => {
    dict[pair.key] = { nodeCount: pair.doc_count };
  });

  const edgeAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
  const edgeResult = await edgeAdapter.getFacets('model_id', [
    {
      field: 'model_id',
      value: modelIDs
    }
  ]);

  edgeResult.forEach(pair => {
    if (dict[pair.key]) dict[pair.key].edgeCount = pair.doc_count;
  });

  return dict;
};


/**
 * Converts a model edge into a stub statement
 */
const _edge2statement = (edge, polarity) => {
  return {
    id: 'stub_statement',
    belief: 1.0,
    evidence: [
      {
        document_context: {},
        evidence_context: {
          obj_polarity: polarity,
          obj_adjectives: [],
          subj_polarity: 1,
          subj_adjectives: []
        }
      }
    ],
    subj: {
      factor: 'user',
      concept: edge.source,
      concept_score: 1,
      adjectives: [],
      polarity: 1,
      theme: 'user',
      theme_property: 'user',
      process: 'user',
      process_property: 'user'
    },
    obj: {
      factor: 'user',
      concept: edge.target,
      concept_score: 1,
      adjectives: [],
      polarity,
      theme: 'user',
      theme_property: 'user',
      process: 'user',
      process_property: 'user'
    }
  };
};

const statementOptions = {
  size: DEFAULT_BATCH_SIZE,
  excludes: [
    'wm',
    'subj.candidates',
    'obj.candidates',
    'evidence.document_context.ner_analytics'
  ]
};

const buildModelStatements = async (modelId) => {
  Logger.info(`Building raw indra statements ${modelId}`);
  const edgeParameterAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);

  // 1. Get and seperate statement edges from user defined edges
  const edgeParameters = await edgeParameterAdapter.find([
    { field: 'model_id', value: modelId }
  ], {
    size: SEARCH_LIMIT,
    includes: ['id', 'source', 'target', 'user_polarity', 'reference_ids']
  });

  const model = await findOne(modelId);
  const projectId = model.project_id;
  const statementAdapter = Adapter.get(RESOURCE.STATEMENT, projectId);

  const results = [];
  for (let i = 0; i < edgeParameters.length; i++) {
    const userPolarity = edgeParameters[i].user_polarity;
    const filters = {
      clauses: [
        { field: 'id', values: edgeParameters[i].reference_ids, operand: 'OR', isNot: false }
      ]
    };

    if (!_.isNil(userPolarity)) {
      filters.clauses.push({ field: 'statementPolarity', values: [userPolarity], operand: 'OR', isNot: false });
    }
    const statements = await statementAdapter.find(filters, statementOptions);

    // Convert
    if (statements.length === 0) {
      results.push(_edge2statement(edgeParameters[i], userPolarity));
    } else {
      statements.forEach(statement => {
        // We need to transform the statements concept to reflect the CAG's topology,
        // we also need to sure the statement ids are unique
        statement.subj.concept = edgeParameters[i].source;
        statement.obj.concept = edgeParameters[i].target;
        statement.id = `${edgeParameters[i].id}-${statement.id}`;
        results.push(statement);
      });
    }
  }
  return results;
};

/**
 * Set initial value and aggregation function of model graph parameters that are received from model engine
 *
 * @param {object} modelParameters        - map of node parameters returned from create model request
 * @param {object} modelParameters.nodes  - map of registered model nodes with node parameters
 * @param {array} modelParameters.edges   - list of registered model edges with edge parameters
 * @param {object} nodeMap                - map of nodes in model
 * @param {object} edgeMap                - map of edges in model
 */
const setInitialParameters = async (modelParameters, nodeMap, edgeMap) => {
  Logger.info('Updating initial Values');
  const nodeParameterPayload = [];
  const edgeParameterPayload = [];
  const nodeParameters = modelParameters.nodes;
  const edgeParameters = modelParameters.edges;

  // 1. Create node parameter payload
  for (const concept in nodeParameters) {
    const initialParameters = nodeParameters[concept];
    if (_.isEmpty(initialParameters)) continue;
    nodeParameterPayload.push({
      id: nodeMap[concept],
      modified_at: moment().valueOf(),
      parameter: {
        initial_value: initialParameters.initialValue,
        initial_value_parameter: {
          func: initialParameters.initialValueFunc
        }
      }
    });
  }

  // 2. Create edge parameter payload
  for (const edge of edgeParameters) {
    const edgeId = `${edge.source}///${edge.target}`;
    if (edgeMap[edgeId]) {
      edgeParameterPayload.push({
        id: edgeMap[edgeId],
        parameter: {
          weight: parseFloat(edge.weight)
        }
      });
    }
  }

  const keyFn = (d) => {
    return d.id;
  };
  if (nodeParameterPayload.length > 0) {
    // create node payload for initial value update
    const nodeParameterAdapter = Adapter.get(RESOURCE.NODE_PARAMETER);
    const nodeParameterUpdateResult = await nodeParameterAdapter.update(nodeParameterPayload, keyFn);
    if (nodeParameterUpdateResult.errors) {
      throw new Error(JSON.stringify(nodeParameterUpdateResult.items[0]));
    }
  }

  if (edgeParameterPayload.length > 0) {
    // create edge payload for initial value update
    const edgeParameterAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
    const edgeParameterUpdateResult = await edgeParameterAdapter.update(edgeParameterPayload, keyFn);
    if (edgeParameterUpdateResult.errors) {
      throw new Error(JSON.stringify(edgeParameterUpdateResult.items[0]));
    }
  }
};

/**
 * Build payload to run projections on modeling engine
 *
 * @param {string}  modelId
 * @param {string}  engine
 * @param {integer} projectionStart - timestamp of projection start date
 * @param {integer}  numTimeSteps - number of time steps
 * @param {array}   parameters - existing clamp parameters
 */
const buildProjectionPayload = async (modelId, engine, projectionStart, projectionEnd, numTimeSteps, parameters) => {
  const constraints = _.isEmpty(parameters) ? [] : parameters;
  const payload = {
    experimentType: EXPERIMENT_TYPE.PROJECTION,
    experimentParam: {
      numTimesteps: numTimeSteps,
      startTime: projectionStart,
      endTime: projectionEnd,
      constraints
    }
  };
  return payload;
};

/**
 * Build payload to run sensitivity analysis on modeling engine
 *
 * @param {string}  engine
 * @param {integer} experimentStart - timestamp of start date
 * @param {integer}  numTimeSteps - number of time steps
 * @param {array}   constraintParams - existing clamp parameters
 * @param {string}   analysisType - one of { "IMMEDIATE", "GLOBAL", "PATHWAYS" }
 * @param {string}   analysisMode - one of { "STATIC", "DYNAMIC" }
 * @param {object}   analysisParams - parameters for analysis
 * @param {object}   analysisMethodology - one of HYBRID or FUNCTION
 */
const buildSensitivityPayload = async (engine, experimentStart, experimentEnd, numTimeSteps,
  constraintParams, analysisType, analysisMode, analysisParams, analysisMethodology) => {
  let payload;
  if (engine === 'delphi' || engine === 'delphi_dev') {
    payload = {};
  } else if (engine === 'dyse') {
    const constraints = _.isEmpty(constraintParams) ? [] : constraintParams;
    payload = {
      experimentType: EXPERIMENT_TYPE.SENSITIVITY_ANALYSIS,
      experimentParam: {
        numTimesteps: numTimeSteps,
        startTime: experimentStart,
        endTime: experimentEnd,
        constraints,
        analysisType,
        analysisMode,
        analysisParam: analysisParams,
        analysisMethodology
      }
    };
  }

  return payload;
};

/**
 * Build payload to run goal optimization on modeling engine
 *
 * @param {string}  modelId
 * @param {string}  engine
 * @param {array} goals - array of concepts and target values
 */
const buildGoalOptimizationPayload = async (modelId, engine, goals) => {
  let payload;
  if (engine === 'delphi' || engine === 'delphi_dev') {
    payload = {};
  } else if (engine === 'dyse') {
    payload = {
      experimentType: EXPERIMENT_TYPE.GOAL_OPTIMIZATION,
      experimentParam: {
        goals
      }
    };
  }

  return payload;
};

/* PUT clear node/edge parameter by ID */
const clearNodeParameter = async (modelId, nodeId) => {
  Logger.info(`Resetting node's parameter with id ${nodeId} in model ${modelId}`);
  const modifiedAt = moment.utc().valueOf();
  // Clear node parameter by ID
  const nodeParameterAdapter = Adapter.get(RESOURCE.NODE_PARAMETER);
  const updatePayload = {
    id: nodeId,
    parameter: null,
    modified_at: modifiedAt
  };
  const nodeUpdateResult = nodeParameterAdapter.update(updatePayload, (d) => d.id);
  if (nodeUpdateResult.errors) {
    throw new Error(JSON.stringify(nodeUpdateResult.items[0]));
  }

  // Update sync status
  const modelPayload = {
    id: modelId,
    status: MODEL_STATUS.NOT_REGISTERED,
    engine_status: RESET_ALL_ENGINE_STATUS,
    modified_at: modifiedAt
  };
  const modelAdapter = Adapter.get(RESOURCE.MODEL);
  const modelUpdateResult = await modelAdapter.update(modelPayload, (d) => d.id);
  if (modelUpdateResult.errors) {
    throw new Error(JSON.stringify(modelUpdateResult.items[0]));
  }
};

/**
 *
 */
const buildNodeParametersPayload = (nodeParameters, model) => {
  const r = [];

  const projectionStart = _.get(model.parameter, 'projection_start', Date.UTC(2021, 0));

  nodeParameters.forEach((np, idx) => {
    if (_.isEmpty(np.parameter)) {
      throw new Error(`${np.concept} is not parameterized`);
    } else {
      let indicatorTimeSeries = _.get(np.parameter, 'timeseries');
      indicatorTimeSeries = indicatorTimeSeries.filter(d => d.timestamp < projectionStart);

      if (_.isEmpty(indicatorTimeSeries)) {
        // FIXME: Temporary fallback so engines don't blow up - July 2021
        indicatorTimeSeries = [
          { value: 0.0, timestamp: Date.UTC(2017, 0) },
          { value: 0.0, timestamp: Date.UTC(2017, 1) },
          { value: 0.0, timestamp: Date.UTC(2017, 2) }
        ];
      }

      // More hack: DySE needs at least 2 data points
      if (indicatorTimeSeries.length === 1) {
        const timestamp = indicatorTimeSeries[0].timestamp;
        const prevTimestamp = moment.utc(timestamp).subtract(1, 'months').valueOf();
        indicatorTimeSeries.unshift({
          value: indicatorTimeSeries[0].value,
          timestamp: prevTimestamp
        });
      }

      r.push({
        concept: np.concept,
        indicator: np.parameter.name + ` ${idx}`, // Delphi doesn't like duplicate indicators across nodes
        minValue: _.get(np.parameter, 'min', 0),
        maxValue: _.get(np.parameter, 'max', 1),
        values: indicatorTimeSeries,
        numLevels: NUM_LEVELS,
        resolution: _.get(np.parameter, 'temporalResolution', 'month'),
        period: _.get(np.parameter, 'period', 12)
      });
    }
  });
  return r;
};


const buildEdgeParametersPayload = (edgeParameters) => {
  const r = [];
  edgeParameters.forEach(edge => {
    r.push({
      source: edge.source,
      target: edge.target,
      polarity: edge.polarity,
      weights: edge.parameter.weights
    });
  });
  return r;
};


// Build create-model payload
// FIXME
// - Need to determine if we want to override weights
const buildCreateModelPayload = async (model, nodeParameters, edgeParameters) => {
  const projectId = model.project_id;
  const statementAdapter = Adapter.get(RESOURCE.STATEMENT, projectId);

  const nodesPayload = buildNodeParametersPayload(nodeParameters, model);

  const edgesPayload = [];
  for (let i = 0; i < edgeParameters.length; i++) {
    const edge = edgeParameters[i];
    const source = edge.source;
    const target = edge.target;
    const referenceIds = edge.reference_ids;
    const polarity = edge.polarity;

    const filters = {
      clauses: [
        { field: 'id', values: referenceIds, operand: 'OR', isNot: false }
      ]
    };

    // If not ambiguous we can apply additional filter
    if (polarity !== 0) {
      filters.clauses.push({ field: 'statementPolarity', values: [polarity], operand: 'OR', isNot: false });
    }
    const statements = await statementAdapter.find(filters, statementOptions);
    if (statements.length === 0) {
      statements.push(_edge2statement(edge, polarity));
    }
    edgesPayload.push({
      source,
      target,
      polarity,
      statements
    });
  }

  return {
    id: model.id,
    nodes: nodesPayload,
    edges: edgesPayload
  };
};


const buildCreateModelPayloadDeprecated = async (model, nodeParameters, edgeParameters) => {
  const modelStatements = await buildModelStatements(model.id);

  // Sanity check
  const allNodeConcepts = nodeParameters.map(n => n.concept);
  const allEdgeConcepts = edgeParameters.map(e => [e.source, e.target]).flat();
  const extraNodes = _.difference(allNodeConcepts, allEdgeConcepts);
  if (_.isEmpty(modelStatements) || extraNodes.length > 0) {
    throw new Error('Unabled to process model. Ensure the model has no isolated nodes.');
  }

  return {
    id: model.id,
    statements: modelStatements,
    conceptIndicators: buildNodeParametersPayloadDeprecated(nodeParameters, model)
  };
};

const buildNodeParametersPayloadDeprecated = (nodeParameters, model) => {
  const r = {};

  const projectionStart = _.get(model.parameter, 'projection_start', Date.UTC(2021, 0));

  nodeParameters.forEach((np, idx) => {
    const valueFunc = _.get(np.parameter, 'initial_value_parameter.func', 'last');

    if (_.isEmpty(np.parameter)) {
      throw new Error(`${np.concept} is not parameterized`);
    } else {
      let indicatorTimeSeries = _.get(np.parameter, 'timeseries');
      indicatorTimeSeries = indicatorTimeSeries.filter(d => d.timestamp < projectionStart);

      if (_.isEmpty(indicatorTimeSeries)) {
        // FIXME: Temporary fallback so engines don't blow up - July 2021
        indicatorTimeSeries = [
          { value: 0.0, timestamp: Date.UTC(2017, 0) },
          { value: 0.0, timestamp: Date.UTC(2017, 1) },
          { value: 0.0, timestamp: Date.UTC(2017, 2) }
        ];
      }

      // More hack: DySE needs at least 2 data points
      if (indicatorTimeSeries.length === 1) {
        const timestamp = indicatorTimeSeries[0].timestamp;
        const prevTimestamp = moment.utc(timestamp).subtract(1, 'months').valueOf();
        indicatorTimeSeries.unshift({
          value: indicatorTimeSeries[0].value,
          timestamp: prevTimestamp
        });
      }

      r[np.concept] = {
        // Need to have unique indicator names because Delphi can't handle duplicates
        name: np.parameter.name + ` ${idx}`,
        minValue: _.get(np.parameter, 'min', 0),
        maxValue: _.get(np.parameter, 'max', 1),
        func: valueFunc,
        values: indicatorTimeSeries,
        numLevels: NUM_LEVELS,
        resolution: _.get(np.parameter, 'temporalResolution', 'month'),
        period: _.get(np.parameter, 'period', 12)
      };
    }
  });
  return r;
};


module.exports = {
  find,
  findOne,
  getModelStats,
  buildModelStatements,
  setInitialParameters,
  buildProjectionPayload,
  buildSensitivityPayload,
  buildGoalOptimizationPayload,
  buildNodeParametersPayload,
  buildEdgeParametersPayload,
  clearNodeParameter,

  buildCreateModelPayload,

  // To deprecated once Graph-like api is in
  buildCreateModelPayloadDeprecated,
  buildNodeParametersPayloadDeprecated
};
