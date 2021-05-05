const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = rootRequire('/services/maas-service');

/**
 * Return all model runs for a given model
 */
router.get('/models/:modelId/runs', asyncHandler(async (req, res) => {
  const modelId = req.params.modelId;

  const result = await maasService.getAllModelRuns(modelId);
  res.status(200).json(result);
}));

module.exports = router;
