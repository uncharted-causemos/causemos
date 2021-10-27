const maasService = rootRequire('/services/external/maas-service');
const datacubeService = rootRequire('/services/datacube-service');

/**
 * Update a set of documents so that their status is now `PROCESSING_FAILED`
 */
const setProcessingFailed = async(metadata) => {
  const docIds = metadata.doc_ids;
  const isIndicator = metadata.is_indicator;
  const newStatus = 'PROCESSING_FAILED';
  if (isIndicator) {
    const metadataDelta = docIds.map(docId => {
      return {
        id: docId,
        status: newStatus
      };
    });
    await datacubeService.updateDatacube(metadataDelta);
    return { result: { message: 'Datacube updated' }, code: 200 };
  } else {
    const modelRun = docIds.map(docId => {
      return {
        id: docId,
        status: newStatus
      };
    });
    await maasService.updateModelRun(modelRun);
    return { result: { message: 'Model run updated' }, code: 200 };
  }
};

module.exports = {
  setProcessingFailed
};
