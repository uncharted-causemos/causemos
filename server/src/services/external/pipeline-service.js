const requestAsPromise = rootRequire('/util/request-as-promise');
const Logger = rootRequire('/config/logger');

const TEST_FLOW_ID = '00701b08-0c52-4b93-801c-7b20ee6ab3d2';
const PIPELINE_FLOW_ID = '4d8d9239-2594-45af-9ec9-d24eafb1f1af';

/**
 * Start a datacube ingest prefect flow using the provided ids
 *
 * @param {string} modelId - modelId provided by Galois
 * @param {string} cubeId - cubeId provided by Galois
 * @param {string} jobId - jobId provided by Galois
 * @param {string} namePrefix - optional prefix for the prefect flow run name
 * @param {boolean} computeTiles - should tile data be computed for the datacube
 * @param {boolean} testRun - temporary flag to run a test flow instead of the ingest flow
 */
const startModelOutputPostProcessing = async (modelId, cubeId, jobId, namePrefix, computeTiles, testRun) => {
  Logger.info(`Start model output processing ${modelId} ${cubeId} ${jobId} `);
  if ((!modelId || !cubeId || !jobId) && !testRun) {
    console.error('Required ids for model output post processing were not provided');
    return;
  }

  const flowId = testRun ? TEST_FLOW_ID : PIPELINE_FLOW_ID;
  let runName = `${modelId} : ${jobId}`;
  runName = namePrefix ? `${namePrefix}: ${runName}` : runName;
  const flowParameters = {
    model_id: modelId,
    run_id: jobId,
    compute_tiles: computeTiles
  };

  // We need the two JSON.stringify below to go from
  // JSON object -> JSON string -> escaped JSON string
  const graphQLQuery = `
    mutation {
      create_flow_run(input: {
        version_group_id: "${flowId}",
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

  return requestAsPromise(pipelinePayload);
};

/**
 * Get the status of a prefect flow submitted with the endpoint above
 *
 * @param {string} ingestJobId - id returned when the flow was submitted
 */
const getJobStatus = async (ingestJobId) => {
  Logger.info(`Get job status ${ingestJobId}`);

  // TODO: Ideally this information should come from an internal source (ie. Redis) rather than prefect directly
  const graphQLQuery = `
    query {
      flow_run(where: { id: {_eq: "${ingestJobId}"}}) {
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
  getJobStatus
};
