const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = rootRequire('/services/external/maas-service');


/**
 * Start a indicator data post processing job
 */
router.post('/:indicatorId/post-process', asyncHandler(async (req, res) => {
  const metadata = req.body;

  try {
    const result = await maasService.startIndicatorPostProcessing(metadata);
    res.status(200).json(result.data || {});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
}));

module.exports = router;
