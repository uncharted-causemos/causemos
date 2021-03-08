const requestAsPromise = rootRequire('/util/request-as-promise');
const Logger = rootRequire('/config/logger');

/**
 * For Galois model output
      flow_id: "2c362d3d-f087-4004-9d2c-7a7b8deec9b0",
      parameters: "{\\"model_id\\": \\"e0a14dbf-e8e6-42bd-b908-e72a956fadd5\\", \\"run_id\\": \\"749916f0-be24-4e4b-9a6c-798808a5be3c\\" }"
 */
const startModelOutputPostProcessing = async (modelId, cubeId, jobId) => {
  Logger.info(`Start model output processing ${modelId} ${cubeId} ${jobId} `);
  const graphQLQuery = `
    mutation {
      create_flow_run(input: {
        version_group_id: "00701b08-0c52-4b93-801c-7b20ee6ab3d2",
        flow_run_name: "test test"
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
  return requestAsPromise(pipelinePayload).catch(err => {
    console.log(err);
  });
};

module.exports = {
  startModelOutputPostProcessing
};
