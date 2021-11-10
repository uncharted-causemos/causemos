const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');
const moment = require('moment');
const { v4: uuid } = require('uuid');
const router = express.Router();
const Logger = rootRequire('/config/logger');
const { setLock, releaseLock } = rootRequire('/cache/node-lru-cache');

const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');
const cagService = rootRequire('/services/cag-service');
const scenarioService = rootRequire('/services/scenario-service');
const indicatorService = rootRequire('/services/indicator-service');
const modelService = rootRequire('/services/model-service');
const historyService = rootRequire('/services/history-service');
const dyseService = rootRequire('/services/external/dyse-service');
const delphiService = rootRequire('/services/external/delphi-service');
const { MODEL_STATUS, RESET_ALL_ENGINE_STATUS } = rootRequire('/util/model-util');
const modelUtil = rootRequire('util/model-util');

const HISTORY_START_DATE = '2015-01-01';
const HISTORY_END_DATE = '2020-12-01';
const PROJECTION_START_DATE = '2021-01-01';
const DEFAULT_NUM_STEPS = 12;


const DYSE = 'dyse';
const DELPHI = 'delphi';

// const esLock = {};

// FIXME: This is a bit confusing with the regsiter endpoint because they kind of operate along the
// same lines (you can't really have a quantified model without also having it registered). Should
// consider merging.
router.post('/:modelId', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  Logger.info(`initializing model with id ${modelId}`);

  const model = await modelService.findOne(modelId);

  // if (model.is_stale === false) {
  //   Logger.info(`Model is alraedy initialized ${modelId}`);
  //   res.status(200).send({ updateToken: moment().valueOf() });
  //   return;
  // }

  const modelFields = {};
  if (_.isEmpty(model.parameter)) {
    // initialize model parameters
    const defaultTimeSeriesStart = moment.utc(HISTORY_START_DATE).valueOf();
    const defaultTimeSeriesEnd = moment.utc(HISTORY_END_DATE).valueOf();
    const defaultProjectionStartDate = moment.utc(PROJECTION_START_DATE).valueOf();
    modelFields.parameter = {
      indicator_time_series_range: {
        start: defaultTimeSeriesStart,
        end: defaultTimeSeriesEnd
      },
      num_steps: DEFAULT_NUM_STEPS,
      projection_start: defaultProjectionStartDate,
      engine: 'dyse'
    };
  }
  modelFields.status = 0;
  await cagService.updateCAGMetadata(modelId, modelFields);

  // Set initial time series
  await indicatorService.setDefaultIndicators(modelId);

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
    thumbnail_source: thumbnailSource
  } = req.body;

  // Update the CAG metadata
  await cagService.updateCAGMetadata(modelId, {
    name: name,
    description: description,
    thumbnail_source: thumbnailSource
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
    indicator_time_series_range: indicatorTimeSeriesRange,
    num_steps: numSteps
  } = req.body;

  let invalidateScenarios = false;

  // 1. Build update params
  const modelFields = {};
  const parameter = {};

  if (engine) {
    parameter.engine = engine;
  }
  if (projectionStart) {
    parameter.projection_start = projectionStart;
    invalidateScenarios = true;
  }
  if (indicatorTimeSeriesRange) {
    parameter.indicator_time_series_range = indicatorTimeSeriesRange;
  }
  if (numSteps) {
    parameter.num_steps = numSteps;
    invalidateScenarios = true;
  }

  // Reset sync flag
  modelFields.status = 0;

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



/**
 * GET register payload as a downlodable JSON
 *
 * FIXME: Overlap logic with register end point, should consolidate
 */
router.get('/:modelId/register-payload', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const modelStatements = await modelService.buildModelStatements(modelId);

  // 1. Get list of node parameters and edge parameters associated to the model ID
  const nodeParameters = await cagService.getAllComponents(modelId, RESOURCE.NODE_PARAMETER);
  const edgeParameters = await cagService.getAllComponents(modelId, RESOURCE.EDGE_PARAMETER);


  // Sanity check
  const allNodeConcepts = nodeParameters.map(n => n.concept);
  const allEdgeConcepts = edgeParameters.map(e => [e.source, e.target]).flat();
  const extraNodes = _.difference(allNodeConcepts, allEdgeConcepts);

  if (_.isEmpty(modelStatements) || extraNodes.length > 0) {
    Logger.warn(`Bad model structure detected. Number of statements ${modelStatements.length}. Isolated nodes: ${extraNodes}`);
    res.status(400).send('Unabled to initialize model. Ensure the model has no isolated nodes.');
    return;
  }

  const model = await modelService.findOne(modelId);

  // 2. create payload for model creation in the modelling engine
  const enginePayload = {
    id: modelId,
    statements: modelStatements,
    conceptIndicators: modelService.buildNodeParametersPayload(nodeParameters, model),
    edges: edgeParameters.map(d => ({
      source: d.source,
      target: d.target,
      weights: _.get(d.parameter, 'weights', [0.5, 0.5])
    }))
  };

  res.setHeader('Content-disposition', `attachment; filename=${modelId}.json`);
  res.setHeader('Content-type', 'application/octet-stream');
  res.send(enginePayload);
}));


/**
 * POST register a model against a given modeling engine, this will return the initial
 * node and edge values
 */
router.post('/:modelId/register', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const { engine } = req.body;

  if (setLock(modelId) === false) {
    Logger.warn(`Conflict while registering model ${modelId} with ${engine}. Another transaction in progress`);
    res.status(409).send('Another transaction is running for this model');
    return;
  }

  Logger.info(`Registering model ${modelId} with ${engine}`);
  const modelStatements = await modelService.buildModelStatements(modelId);

  // 1. Get list of node parameters and edge parameters associated to the model ID
  const nodeParameters = await cagService.getAllComponents(modelId, RESOURCE.NODE_PARAMETER);
  // const edgeParameters = await cagService.getAllComponents(modelId, RESOURCE.EDGE_PARAMETER);

  const edgeParameters = (await cagService.getComponents(modelId)).edges;

  // Sanity check
  const allNodeConcepts = nodeParameters.map(n => n.concept);
  const allEdgeConcepts = edgeParameters.map(e => [e.source, e.target]).flat();
  const extraNodes = _.difference(allNodeConcepts, allEdgeConcepts);

  if (_.isEmpty(modelStatements) || extraNodes.length > 0) {
    Logger.warn(`Bad model structure detected. Number of statements ${modelStatements.length}. Isolated nodes: ${extraNodes}`);
    res.status(400).send('Unabled to initialize model. Ensure the model has no isolated nodes.');
    releaseLock(modelId);
    return;
  }

  const model = await modelService.findOne(modelId);

  // 2. create payload for model creation in the modelling engine
  const enginePayload = {
    id: modelId,
    statements: modelStatements,
    conceptIndicators: modelService.buildNodeParametersPayload(nodeParameters, model)
  };

  // 3. register model to engine
  let initialParameters;
  try {
    if (engine === DELPHI) {
      initialParameters = await delphiService.createModel(enginePayload);
    } else if (engine === DYSE) {
      initialParameters = await dyseService.createModel(enginePayload);
    }
  } catch (error) {
    Logger.debug(error);
    res.status(400).send(`Failed to sync with ${engine} : ${modelId}`);
    return;
  }

  // FIXME: move into service
  // When the topology is changed the model is recreated, but we want to retain any prior custom
  // parameterizations on nodes, edges if possible.
  const ts = Date.now();
  if (engine === DYSE) {
    const edgesUpdate = [];
    const edgesOverride = [];

    edgeParameters.forEach(edge => {
      const edgeInit = initialParameters.edges[`${edge.source}///${edge.target}`];

      if (edge.parameter && !_.isEqual(edge.parameter.weights, edgeInit.weights)) {
        if (edge.polarity !== 0) {
          edgesOverride.push({
            source: edge.source,
            target: edge.target,
            polarity: edge.polarity,
            parameter: {
              weights: edge.parameter.weights
            }
          });
        }
      } else {
        edgesUpdate.push({
          id: edge.id,
          modified_at: ts,
          parameter: {
            weights: edgeInit.weights
          }
        });
      }
    });

    if (!_.isEmpty(edgesOverride)) {
      await dyseService.updateEdgeParameter(modelId, modelService.buildEdgeParametersPayload(edgesOverride));
    }
    if (!_.isEmpty(edgesUpdate)) {
      const edgeParameterAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
      const r = await edgeParameterAdapter.update(edgesUpdate, d => d.id, 'wait_for');
      if (r.errors) {
        throw new Error(JSON.stringify(r.items[0]));
      }
    }
  } else if (engine === DELPHI) {
    let r = null;
    const edgeParameterAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
    const updateEdges = [];
    edgeParameters.forEach(edge => {
      updateEdges.push({
        id: edge.id,
        modified_at: ts,
        parameter: {
          weights: initialParameters.edges[`${edge.source}///${edge.target}`].weights
        }
      });
    });
    r = await edgeParameterAdapter.update(updateEdges, d => d.id, 'wait_for');
    if (r.errors) {
      throw new Error(JSON.stringify(r.items[0]));
    }
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
  await scenarioService.invalidateByModel(modelId);


  Logger.info(`registered model to ${engine}`);
  // returns initial value, initial constraints/perturbations, and initial function used to calculate initial value
  res.status(200).send({ updateToken: moment().valueOf(), status: status });

  releaseLock(modelId);
}));

router.get('/:modelId/registered-status', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const engine = req.query.engine;

  let modelStatus = {};
  if (engine === DYSE) {
    modelStatus = await dyseService.modelStatus(modelId);
  } else {
    modelStatus = await delphiService.modelStatus(modelId);
  }

  // FIXME: Different engines have slightly different status codes
  // Update model
  const v = modelStatus.status === 'training' ? MODEL_STATUS.TRAINING : MODEL_STATUS.READY;
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
  const { projectionStart, numTimeSteps, parameters, engine } = req.body;
  if (_.isNil(numTimeSteps)) throw new Error('time step cannot be empty');

  // 2. Build experiment request payload
  const payload = await modelService.buildProjectionPayload(modelId, engine, projectionStart, numTimeSteps, parameters);

  // 3. Create experiment (experiment) in modelling engine
  let result;
  try {
    if (engine === DELPHI) {
      result = await delphiService.createExperiment(modelId, payload);
    } else if (engine === DYSE) {
      result = await dyseService.createExperiment(modelId, payload);
    } else {
      throw new Error('Unsupported engine type');
    }
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
    experimentStart, numTimeSteps, constraints, engine,
    analysisType, analysisMode, analysisParams
  } = req.body;

  if (_.isNil(numTimeSteps)) throw new Error('time step cannot be empty');
  // 2. Build experiment request payload
  const payload = await modelService.buildSensitivityPayload(engine,
    experimentStart, numTimeSteps, constraints, analysisType, analysisMode, analysisParams);

  // 3. Create experiment (experiment) in modelling engine
  let result;
  if (engine === DYSE) {
    result = await dyseService.createExperiment(modelId, payload);
  } else {
    throw new Error(`sensitivity-analysis not implemented for ${engine}`);
  }
  res.json(result);
}));

router.post('/:modelId/goal-optimization', asyncHandler(async (req, res) => {
  // 1. Initialize
  const { modelId } = req.params;
  const { engine, goals } = req.body;

  // 2. Build experiment request payload
  const payload = await modelService.buildGoalOptimizationPayload(modelId, engine, goals);

  // 3. Create experiment (experiment) in modelling engine
  let result;
  if (engine === DYSE) {
    result = await dyseService.createExperiment(modelId, payload);
  } else {
    throw new Error(`goal-optimization not implemented for ${engine}`);
  }
  res.json(result);
}));

router.get('/:modelId/experiments', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const engine = req.query.engine;
  const experimentId = req.query.experiment_id;
  let result;
  if (engine === DELPHI) {
    result = await delphiService.findExperiment(modelId, experimentId);
  } else if (engine === DYSE) {
    result = await dyseService.findExperiment(modelId, experimentId);
  }
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
    Logger.info(`Conflict while updateing model ${modelId} node-parameter. Another transaction in progress`);
    res.status(409).send('Another transaction is running for this model');
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
  const parameter = model.parameter;
  if (_.isNil(parameter)) {
    throw new Error('Model does not contain parameter');
  }
  const engine = parameter.engine;
  const payload = modelService.buildNodeParametersPayload([nodeParameter], model);

  // Register update with engine and retrieve new value
  if (engine === DYSE) {
    await dyseService.updateNodeParameter(modelId, payload);
  } else {
    Logger.warn(`Update node-parameter is undefined for ${engine}`);
  }

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
        frequency: indicatorMatch.frequency + 1
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
        frequency: 1
      };
      await indicatorMatchHistoryAdapter.insert([insertIndicatorMatchPayload], d => d.id);
    }
  }

  await scenarioService.invalidateByModel(modelId);

  await cagService.updateCAGMetadata(modelId, {
    status: MODEL_STATUS.NOT_REGISTERED,
    engine_status: RESET_ALL_ENGINE_STATUS
  });

  historyService.logHistory(modelId, 'set parameter', [nodeBeforeUpdate], []);

  res.status(200).send({ updateToken: moment().valueOf() });

  releaseLock(modelId);
}));



/**
 * POST Update edge weights
 */
router.post('/:modelId/edge-parameter', asyncHandler(async (req, res) => {
  const { modelId } = req.params;
  const { id, source, target, polarity, parameter } = req.body;

  if (setLock(modelId) === false) {
    Logger.info(`Conflict while updateing model ${modelId} edge-parameter. Another transaction in progress`);
    res.status(409).send('Another transaction is running for this model');
    return;
  }

  // Parse and get meta data
  const model = await modelService.findOne(modelId);
  const modelParameter = model.parameter;
  const engine = modelParameter.engine;

  const payload = modelService.buildEdgeParametersPayload([{ source, target, polarity, parameter }]);

  if (engine === DYSE) {
    await dyseService.updateEdgeParameter(modelId, payload);
  } else {
    throw new Error(`updateEdgeParameter not implemented for ${engine}`);
  }

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

  // FIXME: double check we do not need to flag cag as unregistered
  // await cagService.updateCAGMetadata(modelId, { status: MODEL_STATUS.NOT_REGISTERED });

  historyService.logHistory(modelId, 'set weights', [], [{ source, target, parameter }]);

  res.status(200).send({ updateToken: moment().valueOf() });

  releaseLock(modelId);
}));

module.exports = router;
