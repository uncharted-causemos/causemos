const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = rootRequire('/services/external/maas-service');
const { respondUsingCode } = rootRequire('/util/model-run-util.ts');

/**
 * Submit a new model run to Jataware and store information about it in ES.
 */
router.post('/', asyncHandler(async (req, res) => {
  await respondUsingCode(req, res, maasService.submitModelRun);
}));

/**
 * Return all model runs for a given model
 */
router.get('/', asyncHandler(async (req, res) => {
  const modelId = req.query.modelId;
  const result = await maasService.getAllModelRuns(modelId, true);
  res.status(200).json(result);
}));

/**
 * Start a model data post processing job
 */
router.post('/:runId/post-process', asyncHandler(async (req, res) => {
  await respondUsingCode(req, res, maasService.startModelOutputPostProcessing);
}));

/**
 * Inform of model execution failure
 */
router.post('/:runId/run-failed', asyncHandler(async (req, res) => {
  await respondUsingCode(req, res, maasService.markModelRunFailed);
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

/**
 * Update a model run
 */
router.put('/:modelRunId', asyncHandler(async (req, res) => {
  const modelRun = req.body;
  const result = await maasService.updateModelRun(modelRun);
  res.json(result);
}));

module.exports = router;
