const express = require('express');
const asyncHandler = require('express-async-handler');
const _ = require('lodash');
const router = express.Router();
const { RESOURCE } = require('#@/adapters/es/adapter.js');
const { client, searchAndHighlight, queryStringBuilder } = require('#@/adapters/es/client.js');
const { listCountries, getGadmNameToIso2Map } = require('#@/services/regions-service.js');

/* Keycloak Authentication */
const authUtil = require('#@/util/auth-util.js');

const MAX_REGIONS = 10000;
const SORT_COUNTRIES_ASC = true;

/**
 * GET list of countries (unique array of string names)
 */
router.get(
  '/countries',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const result = await listCountries(SORT_COUNTRIES_ASC);
    res.status(200);
    res.json(result);
  })
);

router.get(
  '/gadmNameToISO2Map',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const result = await getGadmNameToIso2Map();
    res.status(200);
    res.json(result);
  })
);

/**
 * GET Search fields based on partial matches
 **/
router.get(
  '/suggestions',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const field = req.query.field;
    const unmodifiedQueryString = req.query.q;

    // If field is provided, limit search to that specific level
    const filters = [];
    if (field) {
      filters.push({ term: { level: field } });
    }

    const builder = queryStringBuilder().setOperator('AND');
    unmodifiedQueryString
      .split(' ')
      .filter((el) => el !== '')
      .forEach((v) => builder.addWildCard(v));

    const results = await searchAndHighlight(RESOURCE.GADM_NAME, builder.build(), filters, [
      'country',
      'admin1',
      'admin2',
      'admin3',
    ]);
    res.json(results.map((result) => result._source));
  })
);

/**
 * GET A bounding box spanning all specified regions
 **/
router.post(
  '/spanning-bbox',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const regionIds = req.body.region_ids;
    if (!_.isArray(regionIds) || regionIds.length === 0) {
      res.status(400).send('region_ids must be a non-empty array');
      return;
    }

    const termsQuery = {
      terms: {
        full_path: regionIds.slice(0, MAX_REGIONS),
      },
    };

    const aggregation = {
      viewport: {
        geo_bounds: {
          field: 'bbox',
        },
      },
    };

    const query = {
      size: 0,
      query: termsQuery,
      aggs: aggregation,
    };

    const resp = await client.search({
      index: RESOURCE.GADM_NAME,
      body: query,
    });

    const result = _.get(resp.body, 'aggregations.viewport.bounds', {});
    res.json(result);
  })
);

module.exports = router;
