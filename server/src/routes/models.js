const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');
const { v4: uuid } = require('uuid');
const router = express.Router();
const Logger = rootRequire('/config/logger');
const { setLock, releaseLock, LOCK_TIMEOUT } = rootRequire('/cache/node-lru-cache');

const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');
const cagService = rootRequire('/services/cag-service');
const scenarioService = rootRequire('/services/scenario-service');
const indicatorService = rootRequire('/services/indicator-service');
const modelService = rootRequire('/services/model-service');
const historyService = rootRequire('/services/history-service');
const dyseService = rootRequire('/services/external/dyse-service');

const { MODEL_STATUS } = rootRequire('/util/model-util');
const modelUtil = rootRequire('util/model-util');

const TRANSACTION_LOCK_MSG = `Another transaction is running on model, please try again in ${LOCK_TIMEOUT / 1000} seconds`;

// const esLock = {};

router.get('/:modelId/history', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const historyConn = Adapter.get(RESOURCE.MODEL_HISTORY);
  const historyLogs = await historyConn.find([
    { field: 'model_id', value: modelId }
  ], { size: 10000, sort: [{ modified_at: 'asc' }] });

  res.json(historyLogs);
}));


router.post('/:modelId/history', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const { type, text } = req.body;
  historyService.logDescription(modelId, type, text);
  res.json({});
}));

/**
 * Set node quantifications
 */
router.post('/:modelId/quantify-nodes', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const { resolution } = req.body;
  Logger.info(`Quantifying model ${modelId} nodes with ${resolution}`);

  // Set indicator to node groundings
  await indicatorService.setDefaultIndicators(modelId, resolution);
  res.status(200).send({ updateToken: moment().valueOf() });
}));

/**
 * PUT updated metadata in an existing Model
 */
router.put('/:modelId/model-metadata', asyncHandler(async (req, res) => {
  const editTime = moment().valueOf();
  const modelId = req.params.modelId;
  const {
    name,
    description,
    thumbnail_source: thumbnailSource,
    data_analysis_id
  } = req.body;

  // Update the CAG metadata
  await cagService.updateCAGMetadata(modelId, {
    name: name,
    description: description,
    thumbnail_source: thumbnailSource,
    data_analysis_id
  });
  res.status(200).send({ updateToken: editTime });
}));


/**
 * PUT update model parameters (time interval, steps ... etc)
 */
router.put('/:modelId/model-parameter', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const editTime = moment().valueOf();
  Logger.info(`Update model parameters with id ${modelId}`);
  const {
    engine,
    projection_start: projectionStart,
    history_range: historyRange,
    num_steps: numSteps,
    time_scale: timeScale,
    geography
  } = req.body;

  let invalidateScenarios = false;
  let reregisterModel = false;

  // 1. Build update params
  const modelFields = {};
  const parameter = {};

  if (engine) {
    // Note that setting the engine triggers the model to be reregistered if
    //  the engine is different than its previous value.
    // See cagService.updateCAGMetadata().
    parameter.engine = engine;
  }
  if (geography) {
    parameter.geography = geography;
  }
  if (projectionStart) {
    parameter.projection_start = projectionStart;
    invalidateScenarios = true;
    reregisterModel = true;
  }
  if (historyRange) {
    parameter.history_range = historyRange;
  }
  if (numSteps) {
    parameter.num_steps = numSteps;
    invalidateScenarios = true;
  }
  if (timeScale) {
    parameter.time_scale = timeScale;
    invalidateScenarios = true;
  }

  if (reregisterModel === true) {
    modelFields.status = MODEL_STATUS.NOT_REGISTERED;
    modelFields.engine_status = MODEL_STATUS.NOT_REGISTERED;
  }

  if (!_.isEmpty(parameter)) {
    modelFields.parameter = parameter;
  }

  // 2. Update Models with filled params
  const result = await cagService.updateCAGMetadata(modelId, modelFields);

  // 3. Check error
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }

  // 4. Invalidate existing scenarios
  if (invalidateScenarios === true) {
    await scenarioService.invalidateByModel(modelId);
  }

  res.status(200).send({ updateToken: editTime });
}));


/* GET get models */
router.get('/', asyncHandler(async (req, res) => {
  const { project_id, size, from } = req.query;
  const models = await modelService.find(project_id, size, from);
  res.json({
    models: models,
    size,
    from
  });
}));

/* GET get model stats */
router.get('/model-stats', asyncHandler(async (req, res) => {
  const { modelIds } = req.query;
  const modelStats = await modelService.getModelStats(modelIds);
  res.json(modelStats);
}));


/* GET retrieve single model */
router.get('/:modelId', asyncHandler(async (req, res) => {
  const model = await modelService.findOne(req.params.modelId);
  res.json(model);
}));


/* POST new model */
router.post('/', asyncHandler(async (req, res) => {
  const {
    name,
    project_id,
    description,
    thumbnail_source,
    edges,
    nodes
  } = req.body;

  // Create the CAG
  const result = await cagService.createCAG({
    project_id,
    name,
    description,
    thumbnail_source
  }, edges, nodes);

  historyService.logHistory(result.id, 'create', nodes, edges);
  res.json(result);
}));

/**
 * DELETE a CAG
 */
router.delete('/:modelId/', asyncHandler(async (req, res) => {
  const editTime = moment().valueOf();
  const modelId = req.params.modelId;
  await cagService.deleteCAG(modelId);
  res.status(200).send({ updateToken: editTime });
}));


const buildCreateModelPayload = async (modelId) => {
  const model = await modelService.findOne(modelId);
  const modelComponents = await cagService.getComponents(modelId);

  // Sanity check
  const allNodeConcepts = modelComponents.nodes.map(n => n.concept);
  const allEdgeConcepts = modelComponents.edges.map(e => [e.source, e.target]).flat();
  const extraNodes = _.difference(allNodeConcepts, allEdgeConcepts);

  if (extraNodes.length > 0) {
    Logger.warn(`Bad model structure detected. Isolated nodes: ${extraNodes}`);
    throw new Error('Unabled to process model. Ensure the model has no isolated nodes.');
  }
  const payload = await modelService.buildCreateModelPayload(model, modelComponents.nodes, modelComponents.edges);
  return payload;
};

/**
 * GET register payload as a downlodable JSON
 */
router.get('/:modelId/register-payload', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  try {
    const payload = await buildCreateModelPayload(modelId);
    res.setHeader('Content-disposition', `attachment; filename=${modelId}.json`);
    res.setHeader('Content-type', 'application/octet-stream');
    res.send(payload);
  } catch (err) {
    res.status(400).send(err.message);
  }
}));



// Engine will come back with default weight that are inferred, in all cases engine-weights
// are updated.
//
// 1. if edge has no weights, it takes the engine's inferred weights
// 2. if edge has weights, it retains the values and will send back "overrides"
//
const processInferredEdgeWeights = async (modelId, engine, inferredEdgeMap) => {
  const components = await cagService.getComponents(modelId);
  const edgesToUpdate = [];
  const edgesToOverride = [];

  for (const edgeParameter of components.edges) {
    const key = `${edgeParameter.source}///${edgeParameter.target}`;

    const parameter = _.get(edgeParameter, 'parameter', {});
    const currentEngineWeightsConfig = _.get(edgeParameter, 'parameter.engine_weights', {});

    const engineInferredWeights = _.get(inferredEdgeMap[key], 'weights', [0.0, 0.5]);
    const currentWeights = _.get(edgeParameter, 'parameter.weights', []);
    const currentEngineWeights = currentEngineWeightsConfig[engine];

    let updateEngineConfig = false;
    let updateWeights = false;
    let overrideWeights = false;

    Logger.debug(`${key} => engineInferred=${engineInferredWeights}, current=${currentWeights}, currentEngine=${currentEngineWeights}`);

    // Update inferred engine weights
    if (!_.isEqual(engineInferredWeights, currentEngineWeights)) {
      updateEngineConfig = true;
      currentEngineWeightsConfig[engine] = engineInferredWeights;
      parameter.engine_weights = currentEngineWeightsConfig;
    }

    if (_.isEmpty(currentWeights)) {
      updateWeights = true;
      parameter.weights = engineInferredWeights;
    } else if (!_.isEqual(currentWeights, engineInferredWeights)) {
      overrideWeights = true;
    }

    // Resolve state - update on ourside
    if (updateEngineConfig || updateWeights) {
      edgesToUpdate.push({
        id: edgeParameter.id,
        parameter: parameter
      });
    }

    // Resolve state - update to engine
    if (overrideWeights) {
      edgesToOverride.push({
        source: edgeParameter.source,
        target: edgeParameter.target,
        polarity: edgeParameter.polarity,
        parameter: {
          weights: currentWeights
        }
      });
    }
  }

  return {
    edgesToUpdate,
    edgesToOverride
  };
};


/**
 * POST register a model against a given modeling engine, this will return the initial
 * node and edge values
 */
router.post('/:modelId/register', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const { engine } = req.body;

  if (setLock(modelId) === false) {
    Logger.warn(`Conflict while registering model ${modelId} with ${engine}. Another transaction in progress`);
    res.status(409).send(`Conflict while registering model ${modelId} with ${engine}. ` + TRANSACTION_LOCK_MSG);
    return;
  }

  Logger.info(`Registering model ${modelId} with ${engine}`);

  // 1. Generate payload

  // 2. register model to engine
  let initialParameters;
  try {
    const enginePayload = await buildCreateModelPayload(modelId);
    initialParameters = await dyseService.createModel(enginePayload);
  } catch (error) {
    Logger.warn(error);
    res.status(400).send(`Failed to sync with ${engine} : ${modelId}. ${error}`);
    return;
  }

  // Sort out weights
  const { edgesToUpdate, edgesToOverride } = await processInferredEdgeWeights(
    modelId,
    engine,
    initialParameters.edges
  );

  if (edgesToUpdate.length > 0) {
    const edgeParameterAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
    const r = await edgeParameterAdapter.update(edgesToUpdate, d => d.id, 'wait_for');
    if (r.errors) {
      throw new Error(JSON.stringify(r.items[0]));
    }
  }
  if (edgesToOverride.length > 0) {
    await dyseService.updateEdgeParameter(modelId, modelService.buildEdgeParametersPayload(edgesToOverride));
  }

  // 4. Update model status
  const status = initialParameters.status === 'training' ? MODEL_STATUS.TRAINING : MODEL_STATUS.READY;

  const modelPayload = {
    id: modelId,
    status: status,
    engine_status: {
      [engine]: status
    },
    parameter: {
      engine: engine
    },
    modified_at: moment().valueOf()
  };
  const result = await cagService.updateCAGMetadata(modelId, modelPayload);
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }

  // 5. Mark scenarios as invalid
  await scenarioService.invalidateByModelEngine(modelId, engine);

  Logger.info(`registered model to ${engine}`);
  res.status(200).send({ updateToken: moment().valueOf(), status: status });
  releaseLock(modelId);
}));

router.get('/:modelId/registered-status', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const engine = req.query.engine;

  const modelStatus = await dyseService.modelStatus(modelId);

  // FIXME: Different engines have slightly different status codes
  // Update model
  const v = modelStatus.status === 'training' ? MODEL_STATUS.TRAINING : MODEL_STATUS.READY;

  // Update model status
  await cagService.updateCAGMetadata(modelId, {
    status: v,
    engine_status: {
      [engine]: v
    }
  });

  res.json(modelStatus);
}));

router.post('/:modelId/projection', asyncHandler(async (req, res) => {
  // 1. Initialize
  const { modelId } = req.params;
  const { projectionStart, projectionEnd, numTimeSteps, parameters, engine } = req.body;
  if (_.isNil(numTimeSteps)) throw new Error('time step cannot be empty');

  // 2. Build experiment request payload
  const payload = await modelService.buildProjectionPayload(
    modelId,
    engine,
    projectionStart,
    projectionEnd,
    numTimeSteps,
    parameters
  );

  // 3. Create experiment (experiment) in modelling engine
  let result;
  try {
    result = await dyseService.createExperiment(modelId, payload);
  } catch (error) {
    res.status(400).send(`Failed to run projection ${engine} : ${modelId}`);
    return;
  }

  res.json(result);
}));

router.post('/:modelId/sensitivity-analysis', asyncHandler(async (req, res) => {
  // 1. Initialize
  const { modelId } = req.params;
  const {
    experimentStart, experimentEnd, numTimeSteps, constraints, engine,
    analysisType, analysisMode, analysisParams, analysisMethodology
  } = req.body;

  if (_.isNil(numTimeSteps)) throw new Error('time step cannot be empty');
  // 2. Build experiment request payload
  const payload = await modelService.buildSensitivityPayload(engine,
    experimentStart, experimentEnd, numTimeSteps, constraints, analysisType, analysisMode, analysisParams, analysisMethodology);

  // 3. Create experiment (experiment) in modelling engine
  const result = await dyseService.createExperiment(modelId, payload);

  res.json(result);
}));

router.get('/:modelId/experiments', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const experimentId = req.query.experiment_id;
  const result = await dyseService.findExperiment(modelId, experimentId);
  res.json(result);
}));

router.put('/:modelId/nodes/:nodeId/clear-parameter', asyncHandler(async (req, res) => {
  const { modelId, nodeId } = req.params;
  await modelService.clearNodeParameter(modelId, nodeId);

  historyService.logHistory(modelId, 'clear parameter', [{ id: nodeId }], []);

  res.status(200).send({ updateToken: moment.utc().valueOf() });
}));


/**
 * POST Update node indicators
 */
router.post('/:modelId/node-parameter', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const nodeParameter = req.body;

  if (setLock(modelId) === false) {
    Logger.info(`Conflict while updating model ${modelId} node-parameter. Another transaction in progress`);
    res.status(409).send(`Conflict while updating node for model ${modelId}. ` + TRANSACTION_LOCK_MSG);
    return;
  }

  // Recalculate min/max if not specified
  if (_.isNil(nodeParameter.parameter.min) || _.isNil(nodeParameter.parameter.max)) {
    Logger.info('Resetting min / max');
    const { min, max } = modelUtil.projectionValueRange(nodeParameter.parameter.timeseries.map(d => d.value));
    nodeParameter.parameter.min = min;
    nodeParameter.parameter.max = max;
  }

  // Parse and get meta data
  const model = await modelService.findOne(modelId);

  const nodeParameterAdapter = Adapter.get(RESOURCE.NODE_PARAMETER);
  const getNodePayload = [
    { field: 'id', value: nodeParameter.id }
  ];
  const nodeBeforeUpdate = await nodeParameterAdapter.findOne(getNodePayload, {});

  const updateNodePayload = {
    id: nodeParameter.id,
    modified_at: Date.now(),
    parameter: nodeParameter.parameter
  };
  let r = await nodeParameterAdapter.update([updateNodePayload], d => d.id, 'wait_for');
  if (r.errors) {
    Logger.warn(JSON.stringify(r));
    throw new Error('Failed to update node-parameter');
  }


  // only update indicatory match history if setting new indicator and not in the same "session"
  // e.g in the current CAG, a indicator was manually added to a concept
  // so it will only increment frequency if an indicator is being added in multiple CAGs
  const beforeIndicatorId = _.get(nodeBeforeUpdate.parameter, 'id', null);
  const currentIndicatorId = _.get(nodeParameter.parameter, 'id', null);
  if (currentIndicatorId !== null && (beforeIndicatorId === null || currentIndicatorId !== beforeIndicatorId)) {
    const indicatorMatchHistoryAdapter = Adapter.get(RESOURCE.INDICATOR_MATCH_HISTORY);
    const indicatorMatchPayload = [
      { field: 'project_id', value: model.project_id },
      { field: 'concept', value: nodeParameter.concept },
      { field: 'indicator_id', value: nodeParameter.parameter.id }
    ];

    const indicatorMatch = await indicatorMatchHistoryAdapter.findOne(indicatorMatchPayload, {});
    // if indicator has been matched by user to this concept, need to update frequency
    if (!_.isNil(indicatorMatch)) {
      const updateIndicatorMatchPayload = {
        id: indicatorMatch.id,
        frequency: indicatorMatch.frequency + 1,
        modified_at: Date.now()
      };
      r = await indicatorMatchHistoryAdapter.update([updateIndicatorMatchPayload], d => d.id);
      if (r.errors) {
        Logger.warn(JSON.stringify(r));
        throw new Error('Failed to update indicator-match-history');
      }
    } else {
      const insertIndicatorMatchPayload = {
        id: uuid(),
        project_id: model.project_id,
        concept: nodeParameter.concept,
        indicator_id: nodeParameter.parameter.id,
        frequency: 1,
        modified_at: Date.now()
      };
      await indicatorMatchHistoryAdapter.insert([insertIndicatorMatchPayload], d => d.id);
    }
  }

  await clearEdgeWeightsForNode(modelId, nodeParameter.concept);

  await scenarioService.invalidateByModel(modelId);

  await cagService.updateCAGMetadata(modelId, {
    status: MODEL_STATUS.NOT_REGISTERED,
    engine_status: MODEL_STATUS.NOT_REGISTERED
  });

  historyService.logHistory(modelId, 'set parameter', [nodeBeforeUpdate], []);

  res.status(200).send({ updateToken: moment().valueOf() });

  releaseLock(modelId);
}));

// Clear any edge weights that were manually set on edges coming into or
//  leaving the node that was updated.
const clearEdgeWeightsForNode = async (modelId, nodeConcept) => {
  // Get all incoming and outgoing edges
  const edgeComponents = await cagService.getAllComponents(modelId, RESOURCE.EDGE_PARAMETER);
  const adjacentEdges = edgeComponents.filter(
    edge => edge.source === nodeConcept || edge.target === nodeConcept
  );
  const adjacentEdgesToUpdate = adjacentEdges.filter(edge => {
    // Edge parameter is undefined if the edge was just added and hasn't been
    //  registered with an engine yet.
    // No need to update edges whose weights are already cleared.
    const weights = edge.parameter?.weights;
    return weights !== undefined && weights.length !== 0;
  });
  // Remove the weights for each
  adjacentEdgesToUpdate.forEach(edge => {
    edge.parameter.weights = [];
  });
  const edgeParameterAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
  if (adjacentEdgesToUpdate.length > 0) {
    const results = await edgeParameterAdapter.update(
      adjacentEdgesToUpdate,
      (doc) => doc.id
    );
    if (results.errors) {
      throw new Error(JSON.stringify(results.errors[0]));
    }
  }
};



/**
 * POST Update edge weights
 */
router.post('/:modelId/edge-parameter', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const { id, source, target, polarity, parameter } = req.body;

  if (setLock(modelId) === false) {
    Logger.info(`Conflict while updateing model ${modelId} edge-parameter. Another transaction in progress`);
    res.status(409).send(`Conflict while updating edge for model ${modelId}. ` + TRANSACTION_LOCK_MSG);
    return;
  }

  const payload = modelService.buildEdgeParametersPayload([{ source, target, polarity, parameter }]);

  await dyseService.updateEdgeParameter(modelId, payload);

  const edgeParameterAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
  const r = await edgeParameterAdapter.update([{
    id,
    source,
    target,
    modified_at: Date.now(),
    parameter
  }], d => d.id, 'wait_for');

  if (r.errors) {
    Logger.warn(JSON.stringify(r));
    throw new Error('Failed to update edge-parameter');
  }

  await scenarioService.invalidateByModel(modelId);

  historyService.logHistory(modelId, 'set weights', [], [{ source, target, parameter }]);

  res.status(200).send({ updateToken: moment().valueOf() });
  releaseLock(modelId);
}));

module.exports = router;
