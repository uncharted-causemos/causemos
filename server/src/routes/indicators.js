const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const maasService = rootRequire('/services/external/maas-service');


/**
 * Start a indicator data post processing job
 */
router.post('/post-process', asyncHandler(async (req, res) => {
  const metadata = req.body;

  try {
    await maasService.startIndicatorPostProcessing(metadata);
    res.status(200).json({});
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal request returned: ' + err.message);
  }
}));

module.exports = router;
