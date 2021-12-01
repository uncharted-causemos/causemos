const express = require('express');
const asyncHandler = require('express-async-handler');
const _ = require('lodash');
const router = express.Router();
const { RESOURCE } = rootRequire('adapters/es/adapter');
const { client, searchAndHighlight, queryStringBuilder } = rootRequire('adapters/es/client');

/**
 * GET Search fields based on partial matches
 **/
router.get('/suggestions', asyncHandler(async (req, res) => {
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
    .filter(el => el !== '')
    .forEach(v => builder.addWildCard(v));

  const results = await searchAndHighlight(
    RESOURCE.GADM_NAME, builder.build(), filters, ['country', 'admin1', 'admin2', 'admin3']);
  res.json(results.map(result => result._source));
}));

/**
 * GET A bounding box spanning all specified regions
 **/
router.get('/spanning-bbox', asyncHandler(async (req, res) => {
  const regionIds = req.query.ids;

  const termsQuery = {
    bool: {
      must: [
        {
          terms: {
            'country.raw': regionIds
          }
        },
        {
          term: {
            level: 'country'
          }
        }
      ]
    }
  };

  const aggregation = {
    viewport: {
      geo_bounds: {
        field: 'bbox'
      }
    }
  };

  const query = {
    size: 0,
    query: termsQuery,
    aggs: aggregation
  };

  const resp = await client.search({
    index: RESOURCE.GADM_NAME,
    body: query
  });

  const result = _.get(resp.body, 'aggregations.viewport.bounds', {});
  res.json(result);
}));

module.exports = router;
