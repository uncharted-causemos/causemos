const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const dojoSearchService = rootRequire('/services/external/dojo-semantic-search-service');

/**
 * get both causes and effects
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const details = req.body;

    if (details) {
      const result = await dojoSearchService.getCausesAndEffects(details);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing details.');
    }
  })
);

/**
 * get causes
 */
router.post(
  '/causes',
  asyncHandler(async (req, res) => {
    const details = req.body;

    if (details) {
      const result = await dojoSearchService.getCauses(details);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing details.');
    }
  })
);

/**
 * get effects
 */
router.post(
  '/effects',
  asyncHandler(async (req, res) => {
    const details = req.body;

    if (details) {
      const result = await dojoSearchService.getEffects(details);
      res.status(200);
      res.json(result);
    } else {
      res.status(400).send('Bad request, missing details.');
    }
  })
);

module.exports = router;
