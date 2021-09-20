const _ = require('lodash');
const uuid = require('uuid');
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

/**
 * Submit a new model run to Jataware and store information about it in ES.
 *
 * @param {ModelRun} metadata - model run metadata
 */
const submitModelRun = async(metadata) => {
  Logger.info('Submitting model run for execution');

  const pipelinePayload = {
    method: 'POST',
    // url: process.env.DOJO_URL + '/runs',
    url: 'https://dojo-test.com/runs',
    headers: {
      'Authorization': basicAuthToken,
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: metadata
  };

  Logger.info(`Submitting execution request for id: ${metadata.id}`);
  const result = await requestAsPromise(pipelinePayload);
  Logger.info(`Model execution response ${result}`);

  // Insert into ES
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);

  // Assign run name for this newly created model run with a
  // special case if this run is the default run
  const existingRunsCount = await connection.count([
    { field: 'model_id', value: metadata.model_id },
    { field: 'is_default_run', value: false }
  ]);
  const runName = metadata.is_default_run ? 'Default' : 'Run ' + (existingRunsCount + 1);

  return await connection.insert({
    ...metadata,
    status: 'SUBMITTED',
    name: runName
  }, d => d.id);
};

/**
 * Start a datacube ingest prefect flow using the provided ids
 *
 * @param {ModelRun} metadata - model run metadata
 */
const startModelOutputPostProcessing = async (metadata) => {
  Logger.info(`Start model output processing ${metadata.model_name} ${metadata.id} `);
  if (!metadata.model_id || !metadata.id) {
    Logger.error('Required ids for model output post processing were not provided');
    return {};
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

  const qualifierMap = {};
  if (modelMetadata.qualifier_outputs) {
    modelMetadata.outputs.forEach(output => {
      qualifierMap[output.name] = modelMetadata.qualifier_outputs.filter(
        q => !IMPLICIT_QUALIFIERS.includes(q.name)
      ).map(q => q.name);
    });
  }

  // Remove extra fields from Jataware
  metadata.attributes = undefined;
  metadata.default_run = undefined;

  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);

  let docIds = [];
  let result;
  if (await connection.exists([{ field: 'id', value: metadata.id }])) {
    result = await connection.update({
      ...metadata,
      status: 'PROCESSING'
    }, d => d.id);
    docIds = [metadata.id];
  } else {
    result = await connection.insert({
      ...metadata,
      status: 'TEST'
    }, d => d.id);
  }

  const flowParameters = {
    model_id: metadata.model_id,
    run_id: metadata.id,
    doc_ids: docIds,
    data_paths: metadata.data_paths,
    qualifier_map: qualifierMap,
    compute_tiles: true
  };

  await sendToPipeline(flowParameters);
  // Remove extra fields from Jataware
  metadata.attributes = undefined;
  metadata.default_run = undefined;

  return result;
};

/**
 * Mark a model run as failed during model execution
 *
 * @param {ModelRun} metadata - model run metadata
 */
const markModelRunFailed = async (metadata) => {
  Logger.info(`Marking model run as failed ${metadata.model_name} ${metadata.id} `);
  if (!metadata.id) {
    throw new Error('Model run id missing');
  }

  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  return await connection.update({
    id: metadata.id,
    status: 'EXECUTION FAILED'
  }, d => d.id);
};

/**
 * Return all model runs belonging to a model
 *
 * @param{string} modelId - model id
 */
const getAllModelRuns = async(modelId) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  return connection.find([{ field: 'model_id', value: modelId }], { size: SEARCH_LIMIT });
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
    Logger.error('Required ids for indicator post processing were not provided');
    return;
  }
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
      { field: 'status', operand: 'or', isNot: false, values: ['READY'] }
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

  const qualifierMap = {};

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

        qualifierMap[output.name] = clonedMetadata.qualifier_outputs.filter(
          q => !IMPLICIT_QUALIFIERS.includes(q.name)
        ).map(q => q.name);

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

  if (newIndicatorMetadata.length < metadata.outputs.length) {
    Logger.warn(`Filtered out ${metadata.outputs.length - newIndicatorMetadata.length} indicators`);
    if (newIndicatorMetadata.length === 0) {
      Logger.warn('No indicators left to process.');
    }
  }

  const flowParameters = {
    model_id: metadata.id,
    doc_ids: newIndicatorMetadata.map(indicatorMetadata => indicatorMetadata.id),
    run_id: 'indicator',
    data_paths: metadata.data_paths,
    temporal_resolution: resolutions[highestRes],
    qualifier_map: qualifierMap,
    is_indicator: true
  };
  await sendToPipeline(flowParameters);
  if (newIndicatorMetadata.length > 0) {
    const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
    const result = await connection.insert(newIndicatorMetadata, d => d.id);
    return result;
  }
  return 'No documents added';
};

module.exports = {
  submitModelRun,
  startModelOutputPostProcessing,
  markModelRunFailed,
  getAllModelRuns,
  getJobStatus,
  startIndicatorPostProcessing
};

