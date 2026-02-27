import express from 'express';
import asyncHandler from 'express-async-handler';
import _ from 'lodash';
import { RESOURCE } from '#@/adapters/es/adapter.js';
import { client, searchAndHighlight, queryStringBuilder } from '#@/adapters/es/client.js';
import { listCountries, getGadmNameToIso2Map } from '#@/services/regions-service.js';
import * as authUtil from '#@/util/auth-util.js';

const router = express.Router();

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
 */
router.get(
  '/suggestions',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const field = req.query.field as string;
    const unmodifiedQueryString = req.query.q as string;

    const filters: any[] = [];
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
    res.json(results.map((result: any) => result._source));
  })
);

/**
 * GET A bounding box spanning all specified regions
 */
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

export default router;
