const auth = rootRequire('/util/auth-util');
const requestAsPromise = rootRequire('/util/request-as-promise');
/**
 * Get model run result.
 */
const getModelRunResult = async (runId) => {
  const basicAuthToken = auth.getBasicAuthToken(process.env.MAAS_USERNAME, process.env.MAAS_PASSWORD);
  const options = {
    url: `${process.env.MAAS_URL}/run_results/${runId}`,
    method: 'GET',
    headers: {
      Authorization: basicAuthToken
    },
    // HACK: This causes the server to send back properly formatted json in the response.
    //       Note that the json option is not meant for this purpose.
    json: {}
  };
  const result = await requestAsPromise(options);
  return result;
};


module.exports = {
  getModelRunResult
};
