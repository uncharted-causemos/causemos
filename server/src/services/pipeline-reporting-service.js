const maasService = rootRequire('/services/external/maas-service');
const datacubeService = rootRequire('/services/datacube-service');

/**
 * Update a set of documents so that their status is now `READY`
 */
const setProcessingSucceeded = async(metadata) => {
  const docIds = metadata.doc_ids;
  const isIndicator = metadata.is_indicator;

  const updateDelta = docIds.map(docId => {
    return {
      id: docId,
      status: 'READY',
      runtimes: {
        post_processing: {
          end_time: metadata.end_time,
          start_time: metadata.start_time
        }
      }
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

/**
 * Update documents with results from the pipeline (i.e. output_agg_values and data_info)
 */
const setPipelineResults = async(metadata) => {
  const docIds = metadata.doc_ids;
  const isIndicator = metadata.is_indicator;

  const updateDelta = docIds.map(docId => {
    const delta = { id: docId };
    if (metadata.output_agg_values) {
      delta.output_agg_values = metadata.output_agg_values;
    }
    if (metadata.data_info) {
      delta.data_info = metadata.data_info;
    }
    return delta;
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

module.exports = {
  setProcessingFailed,
  setProcessingSucceeded,
  setRuntimeQueued,
  setPipelineResults
};
