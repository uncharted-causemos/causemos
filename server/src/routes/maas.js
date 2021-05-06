const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = rootRequire('/services/external/maas-service');
const uuid = require('uuid');

/**
 * Submit a new model run to Jataware and store information about it in ES.
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    model_id,
    model_name,
    parameters
  } = req.body;

  const metadata = {
    id: uuid(),
    model_id,
    model_name,
    parameters,
    data_paths: [],
    pre_gen_output_paths: [],
    created_at: Date.now()
  };

  const result = await maasService.submitModelRun(metadata);
  res.status(200).json(result);
}));

/**
 * Return all model runs for a given model
 */
router.get('/', asyncHandler(async (req, res) => {
  const modelId = req.query.modelId;
  const result = await maasService.getAllModelRuns(modelId);
  res.status(200).json(result);
}));

/**
 * Start a model data post processing job
 */
router.post('/:runId/post-process', asyncHandler(async (req, res) => {
  const metadata = req.body;

  try {
    const result = await maasService.startModelOutputPostProcessing(metadata);
    res.status(200).json(result.data || {});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
}));

/**
 * Get status of a submitted job
 */
router.get('/:runId/post-process', asyncHandler(async (req, res) => {
  const runId = req.params.runId;

  try {
    const result = await maasService.getJobStatus(runId);
    res.status(200).json(result.data || {});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
}));

module.exports = router;
