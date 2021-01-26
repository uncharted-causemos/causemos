const express = require('express');
const moment = require('moment');
const _ = require('lodash');
const router = express.Router();
const asyncHandler = require('express-async-handler');

const { get } = rootRequire('/cache/node-lru-cache');
const Logger = rootRequire('/config/logger');
const indraService = rootRequire('/services/external/indra-service');
const filtersUtil = rootRequire('/util/filters-util');
const projectService = rootRequire('/services/project-service');
const updateService = rootRequire('/services/update-service');
const cagService = rootRequire('/services/cag-service');

/* GET Retrieve projects */
router.get('/', asyncHandler(async (req, res) => {
  const projects = await projectService.listProjects();

  // copy stats from the LRU cache
  projects.forEach(project => {
    const cached = get(project.id) || {
      // show `--` when cache is not available
      stat: {
        model_count: '--',
        data_analysis_count: '--'
      }
    };
    project.stat = cached.stat;
  });
  res.json(projects);
}));

/* POST Create new project */
router.post('/', asyncHandler(async (req, res) => {
  const baseId = req.body.baseId;
  const projectName = req.body.projectName;
  const result = await projectService.createProject(baseId, projectName);
  res.json(result);
}));

/* GET Retrieve single project summary */
router.get('/:projectId', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const result = await projectService.findProject(projectId);

  // copy stats from the LRU cache
  const cached = get(projectId) || {
    stat: {
      // show `--` when cache is not available
      model_count: '--',
      data_analysis_count: '--'
    }
  };
  result.stat = cached.stat;
  res.json(result);
}));

/* PUT Update INDRA data */
router.put('/:projectId', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const ids = req.body.ids;
  const payload = req.body.payload;

  // Must have updateType, if obj/subj specified must have newValue
  if (!payload.updateType ||
      (!_.isEmpty(payload.subj) && !payload.subj.newValue) ||
      (!_.isEmpty(payload.obj) && !payload.obj.newValue)) {
    throw new Error(`Invalid update config ${JSON.stringify(payload)}`);
  }
  await updateService.updateStatements(projectId, payload, ids);

  // Send a background request to check if CAGs under the projects are stale
  const unaffectedCurations = ['vet_statement', 'factor_polarity'];
  if (!unaffectedCurations.includes(payload.updateType)) {
    cagService.checkStaleCAGs(projectId, ids).catch(function handleError(err) {
      Logger.warn(`Error checking CAG staleness under project ${projectId} ` + err);
    });
  }

  const editTime = moment().valueOf();
  res.status(200).send({ updateToken: editTime });
}));

/* DELETE project */
router.delete('/:projectId', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const timestamp = moment().valueOf();
  await projectService.deleteProject(projectId);
  res.status(200).send({ updateToken: timestamp });
}));

router.get('/:projectId/health', asyncHandler(async (req, res) => {
  const result = await projectService.checkIndexStatus(req.params.projectId);
  res.json({
    indexStatus: result.status
  });
}));


/* GET INDRA statements */
router.get('/:projectId/statements', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const q = req.query;
  const filters = filtersUtil.parse(q.filters);
  const sort = q.sort ? (JSON.parse(q.sort) || {}) : {};
  const from = +q.from || null;
  const size = +q.size || null;

  const options = { from, size, sort };
  if (!_.isNil(q.documents)) options.withDocuments = 1;

  const results = await projectService.findProjectStatements(projectId, filters, options);
  res.json(results);
}));


/* GET Documents (summary) */
router.get('/:projectId/documents', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const q = req.query;
  const filters = filtersUtil.parse(q.filters);
  const from = +q.from || null;
  const size = +q.size || null;

  const documents = await projectService.findProjectDocuments(projectId, filters, {
    from: from,
    size: size
  });
  res.json(documents);
}));


/* GET Map locations */
router.get('/:projectId/locations', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const q = req.query;
  const filters = filtersUtil.parse(q.filters);

  const locations = await projectService.findProjectLocations(projectId, filters);
  res.json(locations);
}));


/* GET Graph */
router.get('/:projectId/graphs', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const q = req.query;
  const filters = filtersUtil.parse(q.filters);

  let graph = null;
  try {
    graph = await projectService.findProjectGraph(projectId, filters);
  } catch (err) {
    console.log(JSON.stringify(err, null, 2));
  }
  res.json(graph);
}));

/* GET project's edges */
router.get('/:projectId/edges', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const filters = filtersUtil.parse(req.query.filters);
  const edges = await projectService.getProjectEdges(projectId, filters);
  res.json(edges);
}));

/* POST Retrieve statement ids given a set of edges and filters */
router.post('/:projectId/edge-data', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const edges = req.body.edges; // Format: [{ source: "wm/concept/causal_factor/social_and_political/government/tax_duty", target:"wm/concept/causal_factor/economic_and_commerce/economic_activity/market/assets" }, { source: "..", target: ".." }]
  const filters = filtersUtil.parse(req.body.filters);

  const results = await projectService.findProjectStatementsByEdges(projectId, filters, edges);
  res.json(results);
}));



/* GET stats for evidence, documents, statements */
router.get('/:projectId/count-stats', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const q = req.query;
  const filters = filtersUtil.parse(q.filters);

  const countStats = await projectService.countStats(projectId, filters);
  res.json(countStats);
}));


const _parseFacetList = (req) => {
  let facetList = [];
  if (req.query.facets) {
    facetList = JSON.parse(req.query.facets);
  }
  return facetList;
};

/* GET facet aggregations */
router.get('/:projectId/facets', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const q = req.query;
  const facetFields = _parseFacetList(req);
  const filters = filtersUtil.parse(q.filters);

  const facetsResult = await projectService.facets(projectId, filters, facetFields);
  res.json(facetsResult);
}));


/* GET Ontology examples */
router.get('/:projectId/ontology-examples', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const examples = await projectService.getOntologyExamples(projectId);
  res.json(examples);
}));

/* POST update belief score */
router.post('/:projectId/update-belief-score', asyncHandler(async (req, res) => {
  const modifiedAt = moment.utc().valueOf();
  const projectId = req.params.projectId;
  const project = get(projectId);
  const corpusId = project.corpus_id;
  const results = await indraService.recalculateBeliefScore(corpusId, projectId);
  await updateService.updateAllBeliefScores(projectId, results);
  res.status(200).send({
    updateToken: modifiedAt
  });
}));

/**
 * POST Get INDRA statements scores
 * Scores are bloated and seldomly used, so we make it a separate endpoint
 **/
router.post('/:projectId/statements-scores', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const ids = req.body.ids;
  const results = await projectService.getProjectStatementsScores(projectId, ids);
  res.json(results);
}));

/**
 * GET Search fields based on partial matches
 **/
router.get('/:projectId/suggestions', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const field = req.query.field;
  const queryString = req.query.q;
  const results = await projectService.searchFields(projectId, field, queryString);
  res.json(results);
}));

/**
 * GET Search path between source and target nodes
 */
router.get('/:projectId/path-suggestions', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;
  const source = req.query.source;
  const target = req.query.target;
  const result = await projectService.searchPath(projectId, source, target, 2);
  res.json(result);
}));

module.exports = router;
