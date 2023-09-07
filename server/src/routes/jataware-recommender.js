const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const dojoSearchService = require('#@/services/external/dojo-semantic-search-service.js');

/* Keycloak Authentication */
// const authUtil = require('#@/util/auth-util.js);

/**
 * get both causes and effects
 */
router.post(
  '/',
  // authUtil.checkRole([authUtil.ROLES.USER]),
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
  // authUtil.checkRole([authUtil.ROLES.USER]),
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
  // authUtil.checkRole([authUtil.ROLES.USER]),
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
