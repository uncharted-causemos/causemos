const _ = require('lodash');
const moment = require('moment');
const delphiUtil = require('../util/delphi-util');
const Logger = rootRequire('/config/logger');

const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');
const modelUtil = rootRequire('/util/model-util');

const DEFAULT_BATCH_SIZE = 1000;
const MODEL_STATUS = modelUtil.MODEL_STATUS;


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
  const edgeAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
  const edgeResult = await edgeAdapter.getFacets('model_id', [
    {
      field: 'model_id',
      value: modelIDs
    }
  ]);

  edgeResult.forEach(pair => {
    dict[pair.key] = { edgeCount: pair.doc_count };
  });

  const nodesAdapter = Adapter.get(RESOURCE.NODE_PARAMETER);
  const nodeResult = await nodesAdapter.getFacets('model_id', [
    {
      field: 'model_id',
      value: modelIDs
    }
  ]);

  nodeResult.forEach(pair => {
    dict[pair.key].nodeCount = pair.doc_count;
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
      polarity: 1
    },
    obj: {
      factor: 'user',
      concept: edge.target,
      concept_score: 1,
      adjectives: [],
      polarity
    }
  };
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

  const statementEdges = edgeParameters.filter(e => !_.isEmpty(e.reference_ids));
  const userEdges = edgeParameters.filter(e => _.isEmpty(e.reference_ids));

  Logger.info(`Found ${statementEdges.length} with backing statements and ${userEdges.length} without`);

  // 2. Get projectId associated to model
  const model = await findOne(modelId);
  const projectId = model.project_id;
  const statementAdapter = Adapter.get(RESOURCE.STATEMENT, projectId);
  let modelStatements = [];
  const statementOptions = {
    size: DEFAULT_BATCH_SIZE,
    excludes: [
      'wm',
      'subj.candidates',
      'obj.candidates',
      'evidence.document_context.ner_analytics'
    ]
  };

  // 3. Retrieve and convert statements to statements with data structure that is compatible for use in modeling engine
  const statementIds = statementEdges.reduce((acc, e) => {
    acc = acc.concat(e.reference_ids);
    return acc;
  }, []);

  // 3.1. Add polarity to list of statements (as a dict), if an edge user_polarity has been set then we need to filter them but we don't haven't fetched the statements and their polarities yet
  const statementEdgeUserPolarities = Object.fromEntries(statementEdges.map(statementEdge => statementEdge.reference_ids.map(referenceId => [referenceId, { polarity: statementEdge.user_polarity, edgeId: statementEdge.id }])).flat());

  while (true) {
    if (statementIds.length === 0) {
      break;
    }
    const batchedIds = statementIds.splice(0, DEFAULT_BATCH_SIZE);
    const statements = await statementAdapter.find({
      clauses: [
        { field: 'id', values: batchedIds, operand: 'OR', isNot: false }
      ]
    }, statementOptions);

    // if an edge had a user_polarity set, filter statements by that.
    const statementsFiltered = statements.filter(s => _.isNil(statementEdgeUserPolarities[s.id].polarity) || ((s.subj.polarity * s.obj.polarity) === statementEdgeUserPolarities[s.id].polarity));

    modelStatements = modelStatements.concat(statementsFiltered);
  }

  // 3.2. edges that didn't survive the filtering based on user_polarity need to be a 'userEdge' basically
  let dummyStatements = [];
  statementEdges.forEach(statementEdge => {
    const isIncluded = modelStatements.some(modelStatement => statementEdgeUserPolarities[modelStatement.id].edgeId === statementEdge.id);
    if (isIncluded === false) {
      dummyStatements.push(_edge2statement(statementEdge, statementEdge.user_polarity));
    }
  });
  if (dummyStatements.length > 0) {
    modelStatements = modelStatements.concat(dummyStatements);
  }

  // 4. Create dummy statement(s) for edges with no statements
  dummyStatements = userEdges.map(e => {
    if (_.isNil(e.user_polarity)) {
      return [
        _edge2statement(e, 1),
        _edge2statement(e, -1)
      ];
    } else { return _edge2statement(e, e.user_polarity); }
  }).flat();

  modelStatements = modelStatements.concat(dummyStatements);
  return modelStatements;
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
const buildProjectionPayload = async (modelId, engine, projectionStart, numTimeSteps, parameters) => {
  const projectionStartDate = moment.utc(projectionStart);

  let payload = {};
  const startTime = projectionStartDate.valueOf();
  // Subtract 1 from numTimeSteps here so, for example, if the start date is Jan 1
  //  and numTimeSteps is 2, the last timestamp will be on Feb 1 instead of Mar 1.
  // endTime should be thought of as the last timestamp that will be returned.
  const endTime = projectionStartDate.add(numTimeSteps - 1, 'M').valueOf();
  const constraints = _.isEmpty(parameters) ? [] : parameters;
  payload = {
    experimentType: EXPERIMENT_TYPE.PROJECTION,
    experimentParam: {
      numTimesteps: numTimeSteps,
      startTime,
      endTime,
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
 */
const buildSensitivityPayload = async (engine, experimentStart, numTimeSteps,
  constraintParams, analysisType, analysisMode, analysisParams) => {
  const experimentStartDate = moment.utc(experimentStart);

  let payload;
  if (engine === 'delphi') {
    payload = {};
  } else if (engine === 'dyse') {
    const startTime = experimentStartDate.valueOf();
    const endTime = experimentStartDate.add(numTimeSteps, 'M').valueOf();
    const constraints = _.isEmpty(constraintParams) ? [] : constraintParams;
    payload = {
      experimentType: EXPERIMENT_TYPE.SENSITIVITY_ANALYSIS,
      experimentParam: {
        numTimesteps: numTimeSteps,
        startTime,
        endTime,
        constraints,
        analysisType,
        analysisMode,
        analysisParam: analysisParams
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
  if (engine === 'delphi') {
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

/**
 * Current Post processing steps for experiment result from delphi - Jul 30
 *  * Convert year/month in result to timestamp
 *
 * @param {object}  experiment
 *
 */
const postProcessDelphiExperiment = (experiment) => {
  const experimentResults = experiment.results;
  const concepts = Object.keys(experimentResults);
  const processedResults = {};
  concepts.forEach(concept => {
    const confidenceInterval = experimentResults[concept].confidenceInterval;
    // convert upper
    const transformedUpper = delphiUtil.convertToTimestamp(confidenceInterval.upper);
    // convert lower
    const transformedLower = delphiUtil.convertToTimestamp(confidenceInterval.lower);
    // convert value
    const transformedValues = delphiUtil.convertToTimestamp(experimentResults[concept].values);
    processedResults[concept] = {
      confidenceInterval: {
        upper: transformedUpper,
        lower: transformedLower
      },
      values: transformedValues
    };
  });
  experiment.results = processedResults;
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
    status: MODEL_STATUS.UNSYNCED,
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
const buildNodeParametersPayload = (nodeParameters) => {
  const r = {};

  nodeParameters.forEach(np => {
    const valueFunc = _.get(np.parameter, 'initial_value_parameter.func', 'last');

    if (_.isEmpty(np.parameter)) {
      throw new Error(`${np.concept} is not parameerized`);
    } else {
      let indicatorTimeSeries = _.get(np.parameter, 'timeseries');

      if (_.isEmpty(indicatorTimeSeries)) {
        // FIXME: Temporary fallback so engines don't blow up - July 2021
        indicatorTimeSeries = [
          { value: 0.0, timestamp: Date.UTC(2017, 1) },
          { value: 0.0, timestamp: Date.UTC(2017, 2) },
          { value: 0.0, timestamp: Date.UTC(2017, 3) }
        ];
      }

      r[np.concept] = {
        name: np.parameter.name,
        minValue: _.get(np.parameter, 'min', 0),
        maxValue: _.get(np.parameter, 'max', 1),
        func: valueFunc,
        values: indicatorTimeSeries,
        numLevels: NUM_LEVELS,
        resolution: _.get(np.parameter, 'temporal_resolution', 'month'),
        period: _.get(np.parameter, 'period', 12)
      };
    }
  });
  return r;
};


const buildEdgeParametersPayload = (edgeParameters) => {
  const r = [];
  edgeParameters.forEach(edge => {
    if (edge.polarity === 0) return; // Engine logic tends to be undefined if we update an ambiguous edge (DySE)

    r.push({
      source: edge.source,
      target: edge.target,
      polarity: edge.polarity,
      weights: edge.parameter.weights
    });
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
  postProcessDelphiExperiment,
  clearNodeParameter
};
