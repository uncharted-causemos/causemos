const maasService = rootRequire('/services/external/maas-service');
const datacubeService = rootRequire('/services/datacube-service');
const requestAsPromise = rootRequire('/util/request-as-promise');
const Logger = rootRequire('/config/logger');

/**
 * Update a set of documents after the data has successfully finished.
 * The status is set to 'READY', the runtime of the pipeline is recorded,
 * and the pipeline results file is read from wm-go and added to the metadata.
 */
const setProcessingSucceeded = async(metadata) => {
  const dataId = metadata.data_id;
  const runId = metadata.run_id;
  const docIds = metadata.doc_ids;
  const isIndicator = metadata.is_indicator;
  const flowId = metadata.flow_id;

  Logger.info(`Marking pipeline job successful data_id=${dataId}, run_id=${runId}, flow_id=${flowId}`);
  if (!docIds || docIds.length === 0) {
    Logger.warn('No document IDs have been provided. Skipping...');
    return { result: { message: 'No document IDs' }, code: 400 };
  }

  let results;
  try {
    results = await fetchPipelineResults(dataId, runId);
  } catch (err) {
    Logger.error(err);
    return { result: { message: 'Unable to fetch results.', error: err }, code: 404 };
  }

  // For model runs, add the data info from the default run into the model metadata
  if (!isIndicator) {
    // Fetch the run's metadata to check if it's the default run
    const runs = maasService.getAllModelRuns([{ field: 'id', value: runId }], false);
    if (runs && runs.length > 0 && runs[0].is_default_run) {
      const modelDelta = {
        id: runs[0].model_id,
        ...results
      };
      await datacubeService.updateDatacube(modelDelta);
    }
  }

  const updateDelta = docIds.map(docId => {
    return {
      id: docId,
      status: 'READY',
      flow_id: flowId,
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
  const dataId = metadata.data_id;
  const runId = metadata.run_id;
  const docIds = metadata.doc_ids;
  const isIndicator = metadata.is_indicator;
  const flowId = metadata.flow_id;

  Logger.info(`Marking pipeline job failed data_id=${dataId}, run_id=${runId}, flow_id=${flowId}`);
  if (!docIds || docIds.length === 0) {
    Logger.warn('No document IDs have been provided. Skipping...');
    return { result: { message: 'No document IDs' }, code: 400 };
  }

  const updateDelta = docIds.map(docId => {
    return {
      id: docId,
      flow_id: flowId,
      status: 'PROCESSING FAILED'
    };
  });
  return await updateDocuments(updateDelta, isIndicator);
};

/**
 * Sets the runtimes.queued timestamps for some documents
 */
const setRuntimeQueued = async(metadata) => {
  const dataId = metadata.data_id;
  const runId = metadata.run_id;
  const docIds = metadata.doc_ids;
  const isIndicator = metadata.is_indicator;

  Logger.info(`Setting queue timestamps data_id=${dataId}, run_id=${runId}`);
  if (!docIds || docIds.length === 0) {
    Logger.warn('No document IDs have been provided. Skipping...');
    return { result: { message: 'No document IDs' }, code: 400 };
  }

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

/**
 * Update either the model run or the datacube ES index depending on whether this is an indicator
 */
const updateDocuments = async(updateDelta, isIndicator) => {
  if (isIndicator) {
    await datacubeService.updateDatacubes(updateDelta);
    return { result: { message: 'Datacube updated' }, code: 200 };
  } else {
    await maasService.updateModelRun(updateDelta);
    return { result: { message: 'Model run updated' }, code: 200 };
  }
};

/**
 * Fetch the pipeline results for this run/indicator from wm-go
 */
const fetchPipelineResults = async(dataId, runId) => {
  const options = {
    method: 'GET',
    url: process.env.WM_GO_URL +
      `/maas/output/pipeline-results?data_id=${encodeURI(dataId)}&run_id=${encodeURI(runId)}`,
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: {}
  };
  const response = await requestAsPromise(options);
  return response;
};

module.exports = {
  setProcessingFailed,
  setProcessingSucceeded,
  setRuntimeQueued
};
