const QUEUE_SERVICE_URL = 'http://10.65.18.52:4040/data-pipeline/enqueue';
const requestAsPromise = rootRequire('/util/request-as-promise');

const sendToPipeline = async(flowParameters) => {
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
};

module.exports = {
  sendToPipeline
};
