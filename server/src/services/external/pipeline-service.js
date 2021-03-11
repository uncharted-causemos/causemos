const requestAsPromise = rootRequire('/util/request-as-promise');
const Logger = rootRequire('/config/logger');

const TEST_FLOW_ID = '00701b08-0c52-4b93-801c-7b20ee6ab3d2';
const PIPELINE_FLOW_ID = '4d8d9239-2594-45af-9ec9-d24eafb1f1af';

/**
 * For Galois model output
      flow_id: "2c362d3d-f087-4004-9d2c-7a7b8deec9b0",
      parameters: "{\\"model_id\\": \\"e0a14dbf-e8e6-42bd-b908-e72a956fadd5\\", \\"run_id\\": \\"749916f0-be24-4e4b-9a6c-798808a5be3c\\" }"
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

module.exports = {
  startModelOutputPostProcessing
};
