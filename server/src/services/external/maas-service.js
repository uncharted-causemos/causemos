const _ = require('lodash');
const { v4: uuid } = require('uuid');
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');
const { processFilteredData, removeUnwantedData } = rootRequire('util/post-processing-util.ts');
const requestAsPromise = rootRequire('/util/request-as-promise');
const { sendToPipeline, getFlowStatus, getFlowLogs } = rootRequire('services/external/prefect-queue-service');
const Logger = rootRequire('/config/logger');
const auth = rootRequire('/util/auth-util');
const domainProjectService = rootRequire('/services/domain-project-service');
const datacubeService = rootRequire('/services/datacube-service');
const basicAuthToken = auth.getBasicAuthToken(process.env.DOJO_USERNAME, process.env.DOJO_PASSWORD);

const config = rootRequire('/config/yargs-wrapper');
const allowModelRuns = config.allowModelRuns;
const IMPLICIT_QUALIFIERS = ['timestamp', 'country', 'admin1', 'admin2', 'admin3', 'lat', 'lng', 'feature', 'value'];
const QUALIFIER_MAX_COUNT = 10000;
const QUALIFIER_TIMESERIES_MAX_COUNT = 100;
const QUALIFIER_TIMESERIES_MAX_LEVEL = 1;

/**
 * Submit a new model run to Jataware and store information about it in ES.
 *
 * @param {ModelRun} metadata - model run metadata
 */
const submitModelRun = async(metadata) => {
  const {
    model_id,
    model_name,
    parameters,
    is_default_run = false
  } = metadata;

  const filteredMetadata = {
    model_id,
    model_name,
    parameters,
    id: uuid(),
    data_paths: [],
    is_default_run,
    created_at: Date.now(),
    tags: []
  };
  Logger.info('Submitting model run for execution');

  const pipelinePayload = {
    method: 'POST',
    url: process.env.DOJO_URL + '/runs',
    headers: {
      'Authorization': basicAuthToken,
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: filteredMetadata
  };

  Logger.info(`Submitting execution request for id: ${filteredMetadata.id}`);
  let result;
  try {
    if (allowModelRuns) {
      result = await requestAsPromise(pipelinePayload);
    }
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }
  Logger.info(`Model execution response ${result}`);

  try {
    // Insert into ES
    const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);

    // Assign run name for this newly created model run with a
    // special case if this run is the default run
    const existingRunsCount = await connection.count([
      { field: 'model_id', value: filteredMetadata.model_id },
      { field: 'is_default_run', value: false }
    ]);
    const runName = filteredMetadata.is_default_run ? 'Default' : 'Run ' + (existingRunsCount + 1);

    const result = await connection.insert({
      ...filteredMetadata,
      status: 'SUBMITTED',
      name: runName
    }, d => d.id);
    // If we didn't send the run to Dojo, "simulate" it and fail after some time
    if (!allowModelRuns) {
      setTimeout(async () => {
        await connection.update({
          ...filteredMetadata,
          status: 'PROCESSING'
        }, d => d.id);
        setTimeout(async () => {
          await markModelRunFailed(filteredMetadata);
        }, 20000);
      }, 10000);
    }
    return { result: { es_response: result, run_id: filteredMetadata.id }, code: 201 };
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }
};

/**
 * Start a datacube ingest prefect flow using the provided ids
 *
 * @param {ModelRun} metadata - model run metadata
 */
const startModelOutputPostProcessing = async (metadata) => {
  Logger.info(`Start model output processing ${metadata.model_name} ${metadata.id} `);
  if (!metadata.model_id || !metadata.id) {
    const err = 'Required ids for model output post processing were not provided';
    Logger.error(err);
    return { result: { error: err }, code: 400 };
  }
  const filters = {
    clauses: [
      { field: 'id', operand: 'or', isNot: false, values: [metadata.model_id] }
    ]
  };
  const modelMetadata = (await datacubeService.getDatacubes(filters, {
    includes: ['outputs', 'qualifier_outputs'],
    size: 1
  }))[0];
  if (!modelMetadata) {
    return { result: { error: `Unable to process run. Model metadata for model id ${metadata.model_id} was not found.` }, code: 409 };
  }

  const qualifierMap = {};
  if (modelMetadata.qualifier_outputs) {
    modelMetadata.outputs.forEach(output => {
      qualifierMap[output.name] = modelMetadata.qualifier_outputs
        .filter(q => !IMPLICIT_QUALIFIERS.includes(q.name))
        .filter(qualifier => qualifier.related_features.includes(output.name))
        .map(q => q.name);
    });
  }

  // Remove extra fields from Jataware
  metadata.attributes = undefined;
  metadata.default_run = undefined;

  let httpResponse;
  let docIds = [];
  let result;
  try {
    const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
    if (await connection.exists([{ field: 'id', value: metadata.id }])) {
      result = await connection.update({
        ...metadata,
        status: 'PROCESSING'
      }, d => d.id);
      docIds = [metadata.id];
      httpResponse = { result: { es_response: result }, code: 200 };
    } else {
      result = await connection.insert({
        ...metadata,
        status: 'TEST'
      }, d => d.id);
      httpResponse = { result: { es_response: result }, code: 201 };
    }
  } catch (err) {
    httpResponse = { result: { error: err }, code: 500 };
  }

  const flowParameters = {
    model_id: metadata.model_id,
    run_id: metadata.id,
    doc_ids: docIds,
    data_paths: metadata.data_paths,
    qualifier_map: qualifierMap,
    compute_tiles: true,
    qualifier_thresholds: {
      max_count: QUALIFIER_MAX_COUNT,
      regional_timeseries_count: QUALIFIER_TIMESERIES_MAX_COUNT,
      regional_timeseries_max_level: QUALIFIER_TIMESERIES_MAX_LEVEL
    }
  };
  try {
    await sendToPipeline(flowParameters);
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }
  return httpResponse;
};

/**
 * Mark a model run as failed during model execution
 *
 * @param {ModelRun} metadata - model run metadata
 */
const markModelRunFailed = async (metadata) => {
  Logger.info(`Marking model run as failed ${metadata.model_name} ${metadata.id} `);
  if (!metadata.id) {
    return { result: { error: 'Model run id missing' }, code: 400 };
  }

  try {
    const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
    const result = await connection.update({
      id: metadata.id,
      status: 'EXECUTION FAILED'
    }, d => d.id);
    return { result: { es_response: result }, code: 200 };
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }
};

/**
 * Return all model runs that match the specified filter
 *
 * @param{array} filter - simple ES filter
 * @param{boolean} includeVersion - should the ES doc version be returned
 */
const getAllModelRuns = async(filter, includeVersion) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  return connection.find(filter, { size: SEARCH_LIMIT, version: includeVersion });
};

/**
 * Get the logs of a model run. Use the flowId if provided, otherwise
 * get the flowId from ES using the runId.
 *
 * @param {string} runId - model run id
 * @param {string} flowId - optional flow id in lieu of run id
 */
const getJobLogs = async (runId, flowId = undefined) => {
  Logger.info(`Get logs for ${flowId ? 'flow id' : 'run id'} ${flowId || runId}`);

  if (!flowId) {
    flowId = await _getFlowIdForRun(runId);
    if (!flowId) {
      Logger.error(`No model run found for ${runId}`);
      return;
    }
  }

  return await getFlowLogs(flowId);
};

/**
 * Get the status of a prefect flow submitted with the endpoint above.
 * Use the flowId if provided, otherwise get the flowId from ES using the runId.
 *
 * @param {string} runId - model run id
 * @param {string} flowId - optional flow id in lieu of run id
 */
const getJobStatus = async (runId, flowId = undefined) => {
  Logger.info(`Get job status for ${flowId ? 'flow id' : 'run id'} ${flowId || runId}`);

  if (!flowId) {
    flowId = await _getFlowIdForRun(runId);
    if (!flowId) {
      Logger.error(`No model run found for ${runId}`);
      return;
    }
  }

  return await getFlowStatus(flowId);
};

const _getFlowIdForRun = async (runId) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  const result = await connection.findOne([{ field: 'id', value: runId }], { includes: ['id', 'flow_id'] });
  return _.get(result, 'flow_id');
};

/**
 * Start a datacube ingest prefect flow using the provided ids
 *
 * @param {Indicator} metadata -indicator metadata
 * @param {boolean} fullReplace -should old existing indicators be deleted
 */
const startIndicatorPostProcessing = async (metadata, fullReplace = false) => {
  Logger.info(`Start indicator processing ${metadata.name} ${metadata.id} `);
  if (!metadata.id) {
    const err = 'Required ids for indicator post processing were not provided';
    Logger.error(err);
    return { result: { error: err }, code: 400 };
  }

  // Allow deprecation of indicators while registering a new one. Field removed via `removeUnwantedData`
  const deprecatedIds = metadata.deprecatesIDs;
  processFilteredData(metadata);
  removeUnwantedData(metadata);
  metadata.type = 'indicator';
  metadata.is_hidden = false;
  // ensure for each newly registered indicator datacube a corresponding domain project
  // @TODO: when indicator publish workflow is added,
  //        the following function would be called at:
  //        insertDatacube() in server/src/services/datacube-service
  await domainProjectService.updateDomainProjects(metadata);

  const filters = {
    clauses: [
      { field: 'dataId', operand: 'or', isNot: false, values: [metadata.id] },
      { field: 'type', operand: 'or', isNot: false, values: ['indicator'] },
      { field: 'status', operand: 'or', isNot: false, values: ['READY', 'PROCESSING', 'PROCESSING FAILED'] }
    ]
  };
  const existingIndicators = await datacubeService.getDatacubes(filters, {
    includes: ['id', 'default_feature']
  });

  // Since id is a random uuid, ES will not provide any duplicate protection
  // We will check ourselves using data_id and feature
  if (existingIndicators.length > 0) {
    Logger.warn(`Indicators with data_id ${metadata.id} already exist. Duplicates will not be processed.`);
  }
  const existingIndicatorIds = existingIndicators.reduce((map, i) => map.set(i.default_feature, i.id), new Map());

  const acceptedTypes = ['int', 'float', 'boolean', 'datetime'];
  const resolutions = ['annual', 'monthly', 'dekad', 'weekly', 'daily', 'other'];
  let highestRes = 0;

  // Exclude all implicit qualifiers
  const validQualifiers = metadata.qualifier_outputs.filter(
    q => !IMPLICIT_QUALIFIERS.includes(q.name));

  // Exclude non-numeric outputs
  const numericOutputs = metadata.outputs.filter(output => acceptedTypes.includes(output.type));
  if (numericOutputs.length < metadata.outputs.length) {
    Logger.warn(`Filtered out ${metadata.outputs.length - numericOutputs.length} indicators`);
  }

  const qualifierMap = {};
  for (const output of numericOutputs) {
    qualifierMap[output.name] = validQualifiers
      .filter(qualifier => qualifier.related_features.includes(output.name))
      .map(q => q.name);
  }

  // Create data to send to elasticsearch
  const indicatorMetadata = numericOutputs.map(output => {
    // Determine the highest available temporal resolution
    const outputRes = output.data_resolution && output.data_resolution.temporal_resolution;
    const resIndex = resolutions.indexOf(outputRes || '');
    highestRes = Math.max(highestRes, resIndex);

    const clonedMetadata = _.cloneDeep(metadata);
    clonedMetadata.data_id = metadata.id;
    clonedMetadata.id = existingIndicatorIds.get(output.name) || uuid(); // use existing id if available
    clonedMetadata.outputs = [output];
    clonedMetadata.family_name = metadata.family_name;
    clonedMetadata.default_feature = output.name;
    clonedMetadata.type = metadata.type;
    clonedMetadata.status = 'PROCESSING';

    let qualifierMatches = [];
    if (metadata.qualifier_outputs) {
      // Filter out unrelated qualifiers
      clonedMetadata.qualifier_outputs = _.cloneDeep(metadata.qualifier_outputs.filter(
        qualifier => qualifier.related_features.includes(output.name)));

      // Combine all concepts from the qualifiers into one list
      qualifierMatches = clonedMetadata.qualifier_outputs.map(qualifier => [
        qualifier.ontologies.concepts,
        qualifier.ontologies.processes,
        qualifier.ontologies.properties
      ]).flat(2);

      // Remove qualifier level ontologies
      clonedMetadata.qualifier_outputs.forEach(qualifier => { qualifier.ontologies = undefined; });
    }

    // Append to the concepts from the output
    const allMatches = qualifierMatches.concat(output.ontologies.concepts,
      output.ontologies.processes,
      output.ontologies.properties);

    // Remove output level ontologies
    output.ontologies = undefined;

    clonedMetadata.ontology_matches = _.sortedUniqBy(_.orderBy(allMatches, ['name', 'score'], ['desc', 'desc']), 'name');
    return clonedMetadata;
  });

  // replaceDocIds are the existing indicator ids in ES that will be replaced
  // newDocIds are the new indicator ids
  const [replaceDocIds, newDocIds] = _.partition(indicatorMetadata, meta => existingIndicatorIds.has(meta.name))
    .map(metaList => metaList.map(meta => meta.id));

  // deleteDocIds are old indicators that weren't present in the new dataset
  const deleteDocIds = fullReplace
    ? existingIndicators.map(i => i.id).filter(id => !replaceDocIds.includes(id))
    : [];

  // When processing a NEW datasets, replaceDocIds should be empty.
  Logger.info(`${newDocIds.length} new indicators will be added. ${replaceDocIds.length} indicators will be replaced.`);

  const docIds = indicatorMetadata.map(meta => meta.id);
  const flowParameters = {
    model_id: metadata.id,
    doc_ids: docIds,
    run_id: 'indicator',
    data_paths: metadata.data_paths,
    temporal_resolution: resolutions[highestRes],
    qualifier_map: qualifierMap,
    is_indicator: true,
    compute_tiles: true,
    qualifier_thresholds: {
      max_count: QUALIFIER_MAX_COUNT,
      regional_timeseries_count: QUALIFIER_TIMESERIES_MAX_COUNT,
      regional_timeseries_max_level: QUALIFIER_TIMESERIES_MAX_LEVEL
    }
  };
  try {
    await sendToPipeline(flowParameters);
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }

  try {
    const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
    if (deleteDocIds.length > 0) {
      Logger.info(`${deleteDocIds.length} old indicators will be removed.`);
      await connection.delete(deleteDocIds);
    }
    const result = await connection.insert(indicatorMetadata, d => d.id);
    const response = {
      result:
        {
          es_response: result,
          message: 'Documents inserted',
          new_ids: newDocIds,
          existing_ids: replaceDocIds,
          deleted_ids: deleteDocIds
        },
      code: existingIndicators.length === 0 ? 201 : 200
    };
    if (deprecatedIds) {
      await datacubeService.deprecateDatacubes(metadata.id, deprecatedIds);
    }
    return response;
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }
};

/**
 * Update a model run  with the specified changes
 */
const updateModelRun = async(modelRun) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  return await connection.update(modelRun, doc => doc.id);
};

/**
 * Add a tag to multiple model runs
 */
const addModelTag = async(filter, tag) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);

  const script = {
    lang: 'painless',
    params: {
      tag: tag
    },
    source: `
      if (ctx._source.tags != null) {
        if (!ctx._source.tags.contains(params.tag)) {
          ctx._source.tags.add(params.tag);
        }
      } else {
        ctx._source.tags = [params.tag];
      }
    `
  };
  return await connection.updateByQuery(filter, script);
};

/**
 * Remove a tag from multiple model runs
 */
const removeModelTag = async(filter, tag) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);

  const script = {
    lang: 'painless',
    params: {
      tag: tag
    },
    source: `
      if (ctx._source.tags != null) {
        int i = ctx._source.tags.indexOf(params.tag);
        if (i >= 0) {
          ctx._source.tags.remove(i);
        }
      }
    `
  };
  return await connection.updateByQuery(filter, script);
};

/**
 * Rename a tag used multiple model runs
 */
const renameModelTag = async(filter, oldTag, newTag) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);

  const script = {
    lang: 'painless',
    params: {
      oldTag: oldTag,
      newTag: newTag
    },
    source: `
      if (ctx._source.tags != null) {
        int i = ctx._source.tags.indexOf(params.oldTag);
        if (i >= 0) {
          ctx._source.tags.set(i, params.newTag);
        }
      }
    `
  };
  return await connection.updateByQuery(filter, script);
};

module.exports = {
  submitModelRun,
  startModelOutputPostProcessing,
  markModelRunFailed,
  getAllModelRuns,
  getJobStatus,
  getJobLogs,
  startIndicatorPostProcessing,
  updateModelRun,
  addModelTag,
  removeModelTag,
  renameModelTag
};

