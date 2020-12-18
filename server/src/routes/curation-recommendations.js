const express = require('express');
const asyncHandler = require('express-async-handler');
const filtersUtil = rootRequire('/util/filters-util');
const router = express.Router();
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('adapters/es/adapter');
const curationRecommendationsService = rootRequire('/services/external/curation-recommendations-service');


// Helpers
const getCAGStatements = async (cagId) => {
  let statementIds = [];
  const edgeAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
  const edges = await edgeAdapter.find([
    { field: 'model_id', value: cagId }
  ], { size: SEARCH_LIMIT, includes: ['reference_ids'] });
  edges.forEach(edge => {
    statementIds = statementIds.concat(edge.reference_ids);
  });
  return statementIds;
};

// FIXME: This only grabs the first 10k, not practical to send the entire KB
const getKBStatements = async (projectId, filters) => {
  const statementAdapter = Adapter.get(RESOURCE.STATEMENT, projectId);
  const statements = await statementAdapter.find(filters, { size: SEARCH_LIMIT, includes: ['id'] });
  return statements.map(d => d.id);
};

router.get('/regrounding', asyncHandler(async (req, res) => {
  const q = req.query;
  const projectId = q.project_id;
  const factor = q.factor;
  const numRecommendations = q.num_recommendations;
  const cagId = q.cag_id;

  let statementIds = [];
  if (cagId) {
    statementIds = await getCAGStatements(cagId);
  } else {
    const filters = filtersUtil.parse(q.filters);
    statementIds = await getKBStatements(projectId, filters);
  }

  const result = await curationRecommendationsService.getFactorRecommendations(projectId, statementIds, factor, numRecommendations);
  res.json(result);
}));


router.get('/polarity', asyncHandler(async (req, res) => {
  const q = req.query;
  const projectId = q.project_id;
  const subjFactor = q.subj_factor; // TODO: Should we instead get a statement_id?
  const objFactor = q.obj_factor;
  const polarity = q.polarity;
  const numRecommendations = q.num_recommendations;
  const cagId = q.cag_id;

  let statementIds = [];
  if (cagId) {
    statementIds = await getCAGStatements(cagId);
  } else {
    const filters = filtersUtil.parse(q.filters);
    statementIds = await getKBStatements(projectId, filters);
  }

  const result = await curationRecommendationsService.getPolarityRecommendations(projectId, statementIds, subjFactor, objFactor, polarity, numRecommendations);
  res.json(result);
}));

module.exports = router;
