const maasService = rootRequire('/services/external/maas-service');
const datacubeService = rootRequire('/services/datacube-service');
const requestAsPromise = rootRequire('/util/request-as-promise');

/**
 * Update a set of documents so that their status is now `READY`
 */
const setProcessingSucceeded = async(metadata) => {
  const dataId = metadata.data_id;
  const runId = metadata.run_id;
  const docIds = metadata.doc_ids;
  const isIndicator = metadata.is_indicator;

  const results = await fetchPipelineResults(dataId, runId);

  const updateDelta = docIds.map(docId => {
    return {
      id: docId,
      status: 'READY',
      runtimes: {
        post_processing: {
          end_time: metadata.end_time,
          start_time: metadata.start_time
        }
      },
      ...results
    };
  });
  return await updateDocuments(updateDelta, isIndicator);
};

/**
 * Update a set of documents so that their status is now `PROCESSING_FAILED`
 */
const setProcessingFailed = async(metadata) => {
  const docIds = metadata.doc_ids;
  const isIndicator = metadata.is_indicator;

  const updateDelta = docIds.map(docId => {
    return {
      id: docId,
      status: 'PROCESSING FAILED'
    };
  });
  return await updateDocuments(updateDelta, isIndicator);
};

/**
 * Sets the runtimes.queued status for some documents
 */
const setRuntimeQueued = async(metadata) => {
  const docIds = metadata.doc_ids;
  const isIndicator = metadata.is_indicator;

  const updateDelta = docIds.map(docId => {
    return {
      id: docId,
      runtimes: {
        queued: {
          end_time: metadata.end_time,
          start_time: metadata.start_time
        }
      }
    };
  });
  return await updateDocuments(updateDelta, isIndicator);
};

const updateDocuments = async(updateDelta, isIndicator) => {
  if (isIndicator) {
    await datacubeService.updateDatacubes(updateDelta);
    return { result: { message: 'Datacube updated' }, code: 200 };
  } else {
    await maasService.updateModelRun(updateDelta);
    return { result: { message: 'Model run updated' }, code: 200 };
  }
};

const fetchPipelineResults = async(dataId, runId) => {
  const options = {
    method: 'GET',
    url: process.env.WM_GO_URL + '/maas/output/pipeline-results',
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: {
      data_id: dataId,
      run_id: runId
    }
  };
  const response = await requestAsPromise(options);
  return response;
};

module.exports = {
  setProcessingFailed,
  setProcessingSucceeded,
  setRuntimeQueued
};
