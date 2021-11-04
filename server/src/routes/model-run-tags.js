const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Logger = rootRequire('/config/logger');
const maasService = rootRequire('/services/external/maas-service');

/**
 * Submit a new model run to Jataware and store information about it in ES.
 */
router.put('/', asyncHandler(async (req, res) => {
  const filter = req.body.filter;
  const tag = req.body.tag;
  try {
    const result = await maasService.addModelTag(filter, tag);
    res.status(200).json(result);
  } catch (e) {
    Logger.error(e);
  }
}));

/**
 * Submit a new model run to Jataware and store information about it in ES.
 */
router.delete('/', asyncHandler(async (req, res) => {
  const filter = JSON.parse(req.query.filter);
  const tag = req.query.tag;
  try {
    const result = await maasService.removeModelTag(filter, tag);
    res.status(200).json(result);
  } catch (e) {
    Logger.error(e);
  }
}));

/**
 * Submit a new model run to Jataware and store information about it in ES.
 */
router.patch('/', asyncHandler(async (req, res) => {
  const filter = req.body.filter;
  const oldTag = req.body.oldTag;
  const newTag = req.body.newTag;
  try {
    const result = await maasService.renameModelTag(filter, oldTag, newTag);
    res.status(200).json(result);
  } catch (e) {
    Logger.error(e);
  }
}));

module.exports = router;
