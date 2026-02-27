import express from 'express';
import asyncHandler from 'express-async-handler';
import * as datacubeService from '#@/services/datacube-service.js';
import * as searchService from '#@/services/search-service.js';
import * as filtersUtil from '#@/util/filters-util.js';
import { respondUsingCode } from '#@/util/model-run-util.js';
import * as authUtil from '#@/util/auth-util.js';

const router = express.Router();

/**
 * Insert a new model or indicator metadata doc
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, datacubeService.insertDatacube, [req.body]);
  })
);

/**
 * Update a model or indicator metadata doc
 */
router.put(
  '/:datacubeId',
  asyncHandler(async (req, res) => {
    const datacubeId = req.params.datacubeId;
    const metadata = req.body;
    metadata.id = metadata.id || datacubeId;
    const result = await datacubeService.updateDatacube(metadata);
    res.json(result);
  })
);

/**
 * Deprecate a model or indicator and add information about the new version
 */
router.put(
  '/:datacubeId/deprecate',
  asyncHandler(async (req, res) => {
    const oldDatacubeId = req.params.datacubeId;
    const newVersionId = req.body.new_version_id;
    const result = await datacubeService.deprecateDatacubes(newVersionId, [oldDatacubeId]);
    res.json(result);
  })
);

/**
 * Get status of a submitted job
 */
router.get(
  '/:indicatorId/status',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const indicatorId = req.params.indicatorId;
    const flowId = req.query.flow_id as string | undefined;

    try {
      const result = await datacubeService.getJobStatus(indicatorId, flowId);
      res.status(200).json(result || {});
    } catch (err: any) {
      console.log(err);
      res.status(500).send('Internal request returned: ' + err.message);
    }
  })
);

/**
 * Get processing logs of a submitted job
 */
router.get(
  '/:indicatorId/logs',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const indicatorId = req.params.indicatorId;
    const flowId = req.query.flow_id as string | undefined;

    try {
      const result = await datacubeService.getJobLogs(indicatorId, flowId);
      res.status(200).json(result || {});
    } catch (err: any) {
      console.log(err);
      res.status(500).send('Internal request returned: ' + err.message);
    }
  })
);

/**
 * POST Bulk update multiple indicators
 * NOTE: THIS WILL NOT SEND CHANGES TO DOJO
 */
router.post(
  '/bulk-update-indicator',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const deltas = req.body.deltas;
    const result = await datacubeService.updateDatacubes(deltas, false);
    res.json(result);
  })
);

/**
 * POST Bulk update multiple datacubes
 */
router.post(
  '/add-sparklines',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const datacubes = req.body.datacubes;
    const result = await datacubeService.generateSparklines(datacubes);
    res.json(result);
  })
);

/**
 * Return all datacubes (models and indicators) that match the provided filter.
 */
router.get(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const filters = filtersUtil.parse(req.query.filters as string);
    const options = JSON.parse(req.query.options as string) || {};
    const result = await datacubeService.getDatacubes(filters, options);
    res.json(result);
  })
);

/**
 * Return the number of datacubes that match the provided filter
 */
router.get(
  '/count',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const filters = filtersUtil.parse(req.query.filters as string);
    const result = await datacubeService.countDatacubes(filters);
    res.json(result);
  })
);

/**
 * GET facet aggregations
 */
router.get(
  '/facets',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    let facetList: any[] = [];
    if (typeof req.query.facets === 'string') {
      facetList = JSON.parse(req.query.facets);
    }
    const filters = filtersUtil.parse(req.query.filters as string);

    const facetsResult = await datacubeService.facets(filters, facetList);
    res.json(facetsResult);
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
    const queryString = req.query.q as string;
    const results = await datacubeService.searchFields(field, queryString);
    res.json(results);
  })
);

/**
 * GET Search for data cubes based on query string
 */
router.get(
  '/datacube-suggestions',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const q = req.query.q as string;
    const result = await searchService.rawDatacubeSearch(q);
    res.json(result);
  })
);

/**
 * GET Search for data cubes based on query string
 */
router.get(
  '/datasets',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const type = (req.query.type as string) || 'indicator';
    const limit = Number(req.query.limit) || 0;
    const result = await datacubeService.getDatasets(type, limit);
    res.json(result);
  })
);

/**
 * GET Return a list of all countries covered by one or more datacubes.
 */
router.get(
  '/coverage',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const dataIds = (req.query.data_ids as string[]) || [];
    const datacubes = await datacubeService.getDatacubes(
      { clauses: [{ field: 'dataId', operand: 'or', isNot: false, values: dataIds }] },
      {
        collapse: {
          field: 'data_id',
        },
      }
    );
    const countries = new Set<string>();
    datacubes.forEach((datacube: any) => {
      datacube.geography.country.forEach((country: string) => {
        countries.add(country);
      });
    });
    res.json(Array.from(countries));
  })
);

export default router;
