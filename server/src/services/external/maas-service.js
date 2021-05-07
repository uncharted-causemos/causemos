const _ = require('lodash');
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');
const requestAsPromise = rootRequire('/util/request-as-promise');
const Logger = rootRequire('/config/logger');
const auth = rootRequire('/util/auth-util');

const PIPELINE_FLOW_ID = '4d8d9239-2594-45af-9ec9-d24eafb1f1af';

const basicAuthToken = auth.getBasicAuthToken(process.env.DOJO_USERNAME, process.env.DOJO_PASSWORD);

/**
 * Return all model runs belonging to a model
 *
 * @param {ModelRun} metadata - model run metadata
 */
const submitModelRun = async(metadata) => {
  Logger.info('Submitting model run for execution');

  const pipelinePayload = {
    method: 'POST',
    url: process.env.DOJO_URL + '/runs',
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
 * Return all model runs belonging to a model
 *
 * @param{string} modelId - model id
 */
const getAllModelRuns = async(modelId) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  return connection.find([{ field: 'model_id', value: modelId }], { size: SEARCH_LIMIT });
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
    return;
  }

  const runName = `${metadata.model_name} : ${metadata.id}`;
  const flowParameters = {
    model_id: metadata.model_id,
    run_id: metadata.id,
    data_paths: metadata.data_paths,
    compute_tiles: false
  };

  // We need the two JSON.stringify below to go from
  // JSON object -> JSON string -> escaped JSON string
  const graphQLQuery = `
    mutation {
      create_flow_run(input: {
        version_group_id: "${PIPELINE_FLOW_ID}",
        flow_run_name: "${runName}",
        parameters: ${JSON.stringify(JSON.stringify(flowParameters))}
      }) {
        id
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

  const result = await requestAsPromise(pipelinePayload);
  const flowId = _.get(result, 'data.create_flow_run.id');
  if (flowId) {
    const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
    await connection.update({
      ...metadata,
      flow_id: flowId,
      status: 'PROCESSING'
    }, d => d.id);
  }
  return result;
};

/**
 * Get the status of a prefect flow submitted with the endpoint above
 *
 * @param {string} runId - model run id
 */
const getJobStatus = async (runId) => {
  Logger.info(`Get job status for run ${runId}`);

  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  const result = await connection.findOne([{ field: 'id', value: runId }]);
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

module.exports = {
  startModelOutputPostProcessing,
  getJobStatus,
  getAllModelRuns,
  submitModelRun
};

