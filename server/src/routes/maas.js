const express = require('express');
const request = require('request');
const asyncHandler = require('express-async-handler');

const router = express.Router();
const maasService = rootRequire('/services/maas-service');
const emulatorOutputService = rootRequire('/services/emulator-output-service');
const auth = rootRequire('/util/auth-util');


// Basic authentication for MaaS API
const basicAuthToken = auth.getBasicAuthToken(process.env.MAAS_USERNAME, process.env.MAAS_PASSWORD);

/**
 * GET model output file
 */
router.get('/download/:runId', asyncHandler(async (req, res) => {
  const modelRunResult = await maasService.getModelRunResult(req.params.runId);

  const options = {
    url: modelRunResult.output
  };
  if (modelRunResult.auth_required) {
    options.headers = {
      Authorization: basicAuthToken
    };
  }
  request(options).pipe(res);
}));

/**
 * GET model output time series
 */
router.get('/output/:runId/timeseries', asyncHandler(async (req, res) => {
  const modelOutputTimeseries = await emulatorOutputService.getModelOutputTimeseries({
    runId: req.params.runId,
    model: req.query.model,
    // Model output feature to query for in model output ex. precipitation
    feature: req.query.feature,
    zoom: req.query.zoom
  });
  res.json(modelOutputTimeseries);
}));

/**
 * GET model output stats
 */
router.get('/output/:runId/stats', asyncHandler(async (req, res) => {
  const modelOutputStats = await emulatorOutputService.getModelOutputStats({
    runId: req.params.runId,
    model: req.query.model,
    // Model output feature to query for in model output ex. precipitation
    feature: req.query.feature,
    zoom: req.query.zoom,
    spatialAggFn: req.query.spatialAggFn
  });
  res.json(modelOutputStats);
}));

module.exports = router;
