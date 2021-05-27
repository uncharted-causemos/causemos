const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const datacubeService = rootRequire('/services/datacube-service');

/**
 * Insert a new model or indicator metadate doc
 */
router.post('/', asyncHandler(async (req, res) => {

  // TODO
  res.status(200).json({ FIXME: true });
}));

/**
 * Return all datacubes (models and indicators)
 */
router.get('/', asyncHandler(async (req, res) => {
  const result = await datacubeService.getAllDatacubes();
  res.status(200).json(result);
}));

/**
 * Return one datacube with a specific id.
 * If the id is 'count', return the number of datacubes instead :D
 */
router.get('/:datacubeId', asyncHandler(async (req, res) => {
  const datacubeId = req.params.datacubeId;

  // FIXME: Used by project landing page
  if (datacubeId === 'count') {
    const result = await datacubeService.countDatacubes();
    res.status(200).json(result);
  } else {
    const result = await datacubeService.getDatacube(datacubeId);
    res.status(200).json(result);
  }
}));

module.exports = router;
