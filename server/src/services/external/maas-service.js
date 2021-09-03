const _ = require('lodash');
const uuid = require('uuid');
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');
const { filterAndLog } = rootRequire('util/joi-util.ts');
const { processFilteredData } = rootRequire('util/post-processing-util.ts');
const requestAsPromise = rootRequire('/util/request-as-promise');
const Logger = rootRequire('/config/logger');
const auth = rootRequire('/util/auth-util');
const domainProjectService = rootRequire('/services/domain-project-service');
const datacubeService = rootRequire('/services/datacube-service');


const QUEUE_SERVICE_URL = 'http://10.65.18.52:4040/data-pipeline/enqueue';
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

  // If API call succeeded, insert metadata into ES
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  return await connection.insert({
    ...metadata,
    status: 'SUBMITTED'
  }, d => d.id);
};

/**
 * Start a datacube ingest prefect flow using the provided ids
 *
 * @param {ModelRun} metadata - model run metadata
 */
const startModelOutputPostProcessing = async (metadata) => {
  const filteredMetadata = filterAndLog(Logger, './src/schemas/model-run.schema.json', metadata);
  const filters = {
    clauses: [
      { field: 'id', operand: 'or', isNot: false, values: [filteredMetadata.model_id] }
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

  const flowParameters = {
    model_id: filteredMetadata.model_id,
    run_id: filteredMetadata.id,
    doc_ids: [filteredMetadata.id],
    data_paths: filteredMetadata.data_paths,
    qualifier_map: qualifierMap,
    compute_tiles: true
  };

  const pipelinePayload = {
    method: 'PUT',
    url: QUEUE_SERVICE_URL,
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: flowParameters
  };

  await requestAsPromise(pipelinePayload);
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  const result = await connection.update({
    ...filteredMetadata,
    status: 'PROCESSING'
  }, d => d.id);
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
  const filteredMetadata = filterAndLog(Logger, './src/schemas/indicator.schema.json', metadata);

  processFilteredData(filteredMetadata);
  filteredMetadata.type = 'indicator';
  // ensure for each newly registered indicator datacube a corresponding domain project
  // @TODO: when indicator publish workflow is added,
  //        the following function would be called at:
  //        insertDatacube() in server/src/services/datacube-service
  await domainProjectService.updateDomainProjects(filteredMetadata);

  const filters = {
    clauses: [
      { field: 'dataId', operand: 'or', isNot: false, values: [filteredMetadata.id] },
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
    Logger.warn(`Indicators with data_id ${filteredMetadata.id} already exist. Duplicates will not be processed.`);
  }

  const acceptedTypes = ['int', 'float', 'boolean', 'datetime'];
  const resolutions = ['annual', 'monthly', 'dekad', 'weekly', 'daily', 'other'];
  let highestRes = 0;

  const qualifierMap = {};

  // Create data now to send to elasticsearch
  const newIndicatorMetadata = filteredMetadata.outputs
    .filter(output => acceptedTypes.includes(output.type)) // Don't process non-numeric data
    .filter(output => !existingIndicators.some(item => item.default_feature === output.name))
    .map(output => {
      // Determine the highest available temporal resolution
      const outputRes = output.data_resolution && output.data_resolution.temporal_resolution;
      const resIndex = resolutions.indexOf(outputRes || '');
      highestRes = Math.max(highestRes, resIndex);

      const clonedMetadata = _.cloneDeep(filteredMetadata);
      clonedMetadata.data_id = filteredMetadata.id;
      clonedMetadata.id = uuid();
      clonedMetadata.outputs = [output];
      clonedMetadata.family_name = filteredMetadata.family_name;
      clonedMetadata.default_feature = output.name;
      clonedMetadata.type = filteredMetadata.type;
      clonedMetadata.status = 'PROCESSING';

      let qualifierMatches = [];
      if (filteredMetadata.qualifier_outputs) {
        // Filter out unrelated qualifiers
        clonedMetadata.qualifier_outputs = filteredMetadata.qualifier_outputs.filter(
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

  if (newIndicatorMetadata.length < filteredMetadata.outputs.length) {
    Logger.warn(`Filtered out ${filteredMetadata.outputs.length - newIndicatorMetadata.length} indicators`);
    if (newIndicatorMetadata.length === 0) {
      Logger.warn('No indicators left to process.');
    }
  }

  const flowParameters = {
    model_id: filteredMetadata.id,
    doc_ids: newIndicatorMetadata.map(indicatorMetadata => indicatorMetadata.id),
    run_id: 'indicator',
    data_paths: filteredMetadata.data_paths,
    temporal_resolution: resolutions[highestRes],
    qualifier_map: qualifierMap,
    is_indicator: true
  };

  const pipelinePayload = {
    method: 'PUT',
    url: QUEUE_SERVICE_URL,
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: flowParameters
  };

  await requestAsPromise(pipelinePayload);
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

