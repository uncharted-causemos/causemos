const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const datacubeService = require('#@/services/datacube-service.js');
const searchService = require('#@/services/search-service.js');
const filtersUtil = require('#@/util/filters-util.js');
const { respondUsingCode } = require('#@/util/model-run-util.js');

/* Keycloak Authentication */
const authUtil = require('#@/util/auth-util.js');

/**
 * Insert a new model or indicator metadata doc
 */
router.post(
  '/',
  // This endpoint is accessed by Jataware using basic auth, so we don't check
  //  the user role here.
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    await respondUsingCode(res, datacubeService.insertDatacube, [req.body]);
  })
);

/**
 * Update a model or indicator metadata doc
 */
router.put(
  '/:datacubeId',
  // This endpoint is accessed by Jataware using basic auth, so we don't check
  //  the user role here.
  // authUtil.checkRole([authUtil.ROLES.USER]),
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
  // This endpoint is accessed by Jataware using basic auth, so we don't check
  //  the user role here.
  // authUtil.checkRole([authUtil.ROLES.USER]),
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
    const flowId = req.query.flow_id;

    try {
      const result = await datacubeService.getJobStatus(indicatorId, flowId);
      res.status(200).json(result || {});
    } catch (err) {
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
    const flowId = req.query.flow_id;

    try {
      const result = await datacubeService.getJobLogs(indicatorId, flowId);
      res.status(200).json(result || {});
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal request returned: ' + err.message);
    }
  })
);

/**
 * POST Bulk update multiple indicators
 *
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
    const filters = filtersUtil.parse(req.query.filters);
    const options = JSON.parse(req.query.options) || {};
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
    const filters = filtersUtil.parse(req.query.filters);
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
    let facetList = [];
    if (typeof req.query.facets === 'string') {
      facetList = JSON.parse(req.query.facets);
    }
    const filters = filtersUtil.parse(req.query.filters);

    const facetsResult = await datacubeService.facets(filters, facetList);
    res.json(facetsResult);
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
    const queryString = req.query.q;
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
    const q = req.query.q;
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
    const type = req.query.type || 'indicator';
    const limit = req.query.limit || 0;
    const result = await datacubeService.getDatasets(type, limit);
    res.json(result);
  })
);

/**
 * GET Return a list of all countries covered by one or more datacubes.
 * `req.query.data_ids` is an array of strings IDs for the datacubes.
 * Note that countries are returned in no particular order, and include no duplicates.
 */
router.get(
  '/coverage',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const dataIds = req.query.data_ids || [];
    // Get metadata for each datacube with a dataId in the array
    const datacubes = await datacubeService.getDatacubes(
      { clauses: [{ field: 'dataId', operand: 'or', isNot: false, values: dataIds }] },
      {
        collapse: {
          field: 'data_id',
        },
      }
    );
    // Construct a Set of all countries found in the `geography.country` of all of the datacubes
    const countries = new Set();
    datacubes.forEach((datacube) => {
      datacube.geography.country.forEach((country) => {
        countries.add(country);
      });
    });
    // Convert the Set to an array and return (no guaranteed order)
    res.json(Array.from(countries));
  })
);

module.exports = router;
