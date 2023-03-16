const express = require('express');
const asyncHandler = require('express-async-handler');
const { indicatorSearchByDataId } = rootRequire('/services/search-service');
const router = express.Router();
const maasService = rootRequire('/services/external/maas-service');
const { respondUsingCode } = rootRequire('/util/model-run-util.ts');

/**
 * Start a indicator data post processing job
 */
router.post(
  '/post-process',
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, maasService.startIndicatorPostProcessing, [
      req.body,
      req.query.fullReplace,
    ]);
  })
);

/**
 * Get indicator metadata by data_id.
 * Note that an indicator has one or more outputs (a.k.a "features").
 */
router.get(
  '/metadata',
  asyncHandler(async (req, res) => {
    const dataId = req.query.data_id;
    const result = await indicatorSearchByDataId(dataId);
    res.json(result);
  })
);

module.exports = router;
