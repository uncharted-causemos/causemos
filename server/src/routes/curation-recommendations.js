const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('adapters/es/adapter');
const curationRecommendationsService = rootRequire(
  '/services/external/curation-recommendations-service'
);

/* Keycloak Authentication */
const keycloak = rootRequire('/config/keycloak-config.js').getKeycloak();
const { PERMISSIONS } = rootRequire('/util/auth-util.js');

// Helpers
const getCAGStatements = async (cagId, sourceNode, targetNode) => {
  let statementIds = [];
  const edgeAdapter = Adapter.get(RESOURCE.EDGE_PARAMETER);
  const esClient = edgeAdapter.client;
  const query = {
    bool: {
      filter: [{ term: { model_id: cagId } }],
      should: [{ term: { source: sourceNode } }, { term: { target: targetNode } }],
      minimum_should_match: 1,
    },
  };
  const searchPayload = {
    index: RESOURCE.EDGE_PARAMETER,
    size: SEARCH_LIMIT,
    _source_includes: ['reference_ids'],
    body: { query },
  };

  const response = await esClient.search(searchPayload);
  const edges = response.body.hits.hits.map((d) => d._source);
  edges.forEach((edge) => {
    statementIds = statementIds.concat(edge.reference_ids);
  });
  return statementIds;
};

// FIXME: This only grabs the first 10k, not practical to send the entire KB
const getKBStatements = async (projectId, sourceNode, targetNode) => {
  const statementAdapter = Adapter.get(RESOURCE.STATEMENT, projectId);
  const esClient = statementAdapter.client;
  const query = {
    bool: {
      should: [{ term: { 'subj.concept': sourceNode } }, { term: { 'obj.concept': targetNode } }],
      minimum_should_match: 1,
    },
  };
  const searchPayload = {
    index: projectId,
    size: SEARCH_LIMIT,
    _source_includes: ['id'],
    body: { query },
  };

  const response = await esClient.search(searchPayload);
  const statements = response.body.hits.hits.map((d) => d._source);
  return statements.map((d) => d.id);
};

router.get(
  '/regrounding',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const q = req.query;
    const projectId = q.project_id;
    const factor = q.factor;
    const numRecommendations = q.num_recommendations;
    const cagId = q.cag_id;
    const currentGrounding = q.current_grounding;

    let statementIds = [];
    if (cagId) {
      statementIds = await getCAGStatements(cagId, currentGrounding, currentGrounding);
    } else {
      statementIds = await getKBStatements(projectId, currentGrounding, currentGrounding);
    }

    const result = await curationRecommendationsService.getFactorRecommendations(
      projectId,
      statementIds,
      factor,
      numRecommendations
    );
    res.json(result);
  })
);

router.get(
  '/polarity',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const q = req.query;
    const projectId = q.project_id;
    const subjFactor = q.subj_factor; // TODO: Should we instead get a statement_id?
    const objFactor = q.obj_factor;
    const polarity = q.polarity;
    const numRecommendations = q.num_recommendations;
    const cagId = q.cag_id;
    const subjGrounding = q.subj_grounding;
    const objGrounding = q.obj_grounding;

    let statementIds = [];
    if (cagId) {
      statementIds = await getCAGStatements(cagId, subjGrounding, objGrounding);
    } else {
      statementIds = await getKBStatements(projectId, subjGrounding, objGrounding);
    }

    const result = await curationRecommendationsService.getPolarityRecommendations(
      projectId,
      statementIds,
      subjFactor,
      objFactor,
      polarity,
      numRecommendations
    );
    res.json(result);
  })
);

router.get(
  '/edge-regrounding',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const q = req.query;
    const projectId = q.project_id;
    const numRecommendations = q.num_recommendations;
    const subjConcept = q.subj_concept;
    const objConcept = q.obj_concept;

    const result = await curationRecommendationsService.getEmptyEdgeRecommendations(
      projectId,
      subjConcept,
      objConcept,
      numRecommendations
    );
    res.json(result);
  })
);

router.get(
  '/similar-concepts',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const q = req.query;
    const projectId = q.project_id;
    const numRecommendations = q.num_recommendations;
    const concept = q.concept;

    const result = await curationRecommendationsService.getSimilarConcepts(
      projectId,
      concept,
      numRecommendations
    );
    res.json(result);
  })
);

router.put(
  '/tracking/:trackingId',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const payload = req.body.payload;
    const trackingId = req.params.trackingId;
    await curationRecommendationsService.trackCuration(trackingId, payload);
  })
);

module.exports = router;
