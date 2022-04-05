const _ = require('lodash');
const QUEUE_SERVICE_URL = process.env.WM_QUEUE_SERVICE_URL + '/data-pipeline/enqueue';
const requestAsPromise = rootRequire('/util/request-as-promise');

/**
 * Submit a job to the request queue for execution in prefect
 *
 * @param flowParameters - flow parameters for prefect
 */
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


/**
 * Get the logs of a prefect flow using a flow_id
 *
 * @param {string} flowId - prefect flow id
 */
const getFlowLogs = async (flowId) => {
  const graphQLQuery = `
    query {
      flow_run(where: { id: {_eq: "${flowId}"}}) {
        state
        start_time
        end_time
        logs {
          timestamp
          message
        }
        agent {
          id
          labels
        }
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

  const response = await requestAsPromise(pipelinePayload);
  return _.first(_.get(response, 'data.flow_run'));
};

/**
 * Get the status of a prefect flow
 *
 * @param {string} flowId - prefect flow id
 */
const getFlowStatus = async (flowId) => {
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

  const response = await requestAsPromise(pipelinePayload);
  return _.first(_.get(response, 'data.flow_run'));
};

module.exports = {
  sendToPipeline,
  getFlowLogs,
  getFlowStatus
};
