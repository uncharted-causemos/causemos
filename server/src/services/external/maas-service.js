const _ = require('lodash');
const { v4: uuid } = require('uuid');
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');
const { processFilteredData, removeUnwantedData } = rootRequire('util/post-processing-util.ts');
const requestAsPromise = rootRequire('/util/request-as-promise');
const { sendToPipeline } = rootRequire('services/external/prefect-queue-service');
const Logger = rootRequire('/config/logger');
const auth = rootRequire('/util/auth-util');
const domainProjectService = rootRequire('/services/domain-project-service');
const datacubeService = rootRequire('/services/datacube-service');
const basicAuthToken = auth.getBasicAuthToken(process.env.DOJO_USERNAME, process.env.DOJO_PASSWORD);

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
  const isDevEnvironment = process.env.TD_DATA_URL.includes('10.65.18.69');
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
    if (!isDevEnvironment) {
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
    if (isDevEnvironment) {
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
 * Get the status of a prefect flow submitted with the endpoint above
 *
 * @param {string} runId - model run id
 */
const getJobStatus = async (runId) => {
  Logger.info(`Get job status for run ${runId}`);

  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  const result = await connection.findOne([{ field: 'id', value: runId }], {});
  const flowId = _.get(result, 'flow_id');
  if (!flowId) {
    Logger.error(`No model run found for ${runId}`);
    return;
  }

  // TODO: Ideally this information should come from an internal source (ie. Redis) rather than prefect directly
  const graphQLQuery = `
    query {
      flow_run(where: { id: {_eq: "${flowId}"}}) {
        state
        start_time
        end_time
      }
    }
  `;

  const pipelinePayload = {
    method: 'POST',
    url: process.env.WM_PIPELINE_URL,
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: {
      query: graphQLQuery
    }
  };

  return requestAsPromise(pipelinePayload);
};

/**
 * Start a datacube ingest prefect flow using the provided ids
 *
 * @param {Indicator} metadata -indicator metadata
 */
const startIndicatorPostProcessing = async (metadata) => {
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

  const acceptedTypes = ['int', 'float', 'boolean', 'datetime'];
  const resolutions = ['annual', 'monthly', 'dekad', 'weekly', 'daily', 'other'];
  let highestRes = 0;

  // Exclude all implicit qualifiers
  const validQualifiers = metadata.qualifier_outputs.filter(
    q => !IMPLICIT_QUALIFIERS.includes(q.name));

  const qualifierMap = {};
  for (const output of metadata.outputs) {
    if (acceptedTypes.includes(output.type)) {
      qualifierMap[output.name] = validQualifiers
        .filter(qualifier => qualifier.related_features.includes(output.name))
        .map(q => q.name);
    }
  }

  // Create data now to send to elasticsearch
  const newIndicatorMetadata = metadata.outputs
    .filter(output => acceptedTypes.includes(output.type)) // Don't process non-numeric data
    .filter(output => !existingIndicators.some(item => item.default_feature === output.name))
    .map(output => {
      // Determine the highest available temporal resolution
      const outputRes = output.data_resolution && output.data_resolution.temporal_resolution;
      const resIndex = resolutions.indexOf(outputRes || '');
      highestRes = Math.max(highestRes, resIndex);

      const clonedMetadata = _.cloneDeep(metadata);
      clonedMetadata.data_id = metadata.id;
      clonedMetadata.id = uuid();
      clonedMetadata.outputs = [output];
      clonedMetadata.family_name = metadata.family_name;
      clonedMetadata.default_feature = output.name;
      clonedMetadata.type = metadata.type;
      clonedMetadata.status = 'PROCESSING';

      let qualifierMatches = [];
      if (metadata.qualifier_outputs) {
        // Filter out unrelated qualifiers
        clonedMetadata.qualifier_outputs = metadata.qualifier_outputs.filter(
          qualifier => qualifier.related_features.includes(output.name));

        // Combine all concepts from the qualifiers into one list
        qualifierMatches = clonedMetadata.qualifier_outputs.map(qualifier => [
          qualifier.ontologies.concepts,
          qualifier.ontologies.processes,
          qualifier.ontologies.properties
        ]).flat(2);
      }

      // Append to the concepts from the output
      const allMatches = qualifierMatches.concat(output.ontologies.concepts,
        output.ontologies.processes,
        output.ontologies.properties);

      clonedMetadata.ontology_matches = _.sortedUniqBy(_.orderBy(allMatches, ['name', 'score'], ['desc', 'desc']), 'name');
      return clonedMetadata;
    });

  const newLength = newIndicatorMetadata.length;
  if (newLength < metadata.outputs.length) {
    Logger.warn(`Filtered out ${metadata.outputs.length - newLength} indicators`);
  }

  // When reprocessing a dataset, existingDocIds will be the existing indicator ids in ES,
  // there should be no new indicators (newLength === 0).
  // When processing a new datasets, existingDocIds will be empty.
  const featureNames = metadata.outputs
    .filter(output => acceptedTypes.includes(output.type))
    .map(output => output.name);
  const existingDocIds = existingIndicators
    .filter(item => featureNames.includes(item.default_feature))
    .map(item => item.id);

  Logger.info(`${newLength} new indicators will be added. ${existingDocIds.length} indicators will be updated.`);

  const docIds = existingDocIds.concat(newIndicatorMetadata.map(meta => meta.id));
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

  let response = { result: { message: 'No documents added' }, code: 202 }; // Fallback value
  if (newLength > 0) {
    try {
      const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
      const result = await connection.insert(newIndicatorMetadata, d => d.id);
      response = {
        result:
          {
            es_response: result,
            message: 'Documents inserted',
            new_ids: flowParameters.doc_ids,
            existing_ids: existingIndicators.map(indicator => indicator.id)
          },
        code: existingIndicators.length === 0 ? 201 : 200
      };
    } catch (err) {
      return { result: { error: err }, code: 500 };
    }
  }
  if (deprecatedIds) {
    await datacubeService.deprecateDatacubes(metadata.id, deprecatedIds);
  }
  return response;
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
  startIndicatorPostProcessing,
  updateModelRun,
  addModelTag,
  removeModelTag,
  renameModelTag
};

