const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const pipelineService = rootRequire('/services/external/pipeline-service');

/**
 * Start a model post processing job
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    // Required
    model_id,
    cube_id,
    job_id,

    // Optional
    run_name_prefix,

    // Temporary internal params
    compute_tiles = false,
    test_run = false
  } = req.body;

  try {
    const result = await pipelineService.startModelOutputPostProcessing(
      model_id, cube_id, job_id, run_name_prefix, compute_tiles, test_run);
    res.status(200).json(result.data || {});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
}));

/**
 * Get status of a submitted job
 */
router.get('/:ingestJobId', asyncHandler(async (req, res) => {
  const ingestJobId = req.params.ingestJobId;

  try {
    const result = await pipelineService.getJobStatus(ingestJobId);
    res.status(200).json(result.data || {});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
}));

module.exports = router;
