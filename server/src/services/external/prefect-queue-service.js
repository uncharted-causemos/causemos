const QUEUE_SERVICE_URL = process.env.WM_QUEUE_SERVICE_URL + '/data-pipeline/enqueue';
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
