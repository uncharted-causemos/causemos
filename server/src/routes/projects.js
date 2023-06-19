const express = require('express');
const _ = require('lodash');
const { v4: uuid } = require('uuid');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');

// const { getCache } = rootRequire('/cache/node-lru-cache');
const Logger = rootRequire('/config/logger');
// const indraService = rootRequire('/services/external/indra-service');
const filtersUtil = rootRequire('/util/filters-util');
const projectService = rootRequire('/services/project-service');
const updateService = rootRequire('/services/update-service');
const cagService = rootRequire('/services/cag-service');
const searchService = rootRequire('/services/search-service');

/* Keycloak Authentication */
// const authUtil = rootRequire('/util/auth-util.js');

/* GET Retrieve projects */
router.get(
  '/',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projects = await projectService.listProjects();

    const cagAdapter = Adapter.get(RESOURCE.MODEL);
    const analysisAdapter = Adapter.get(RESOURCE.ANALYSIS);

    // Get number of cag-models and data-analysis
    const projectCAG = await cagAdapter.getFacets('project_id');
    const projectAnalysis = await analysisAdapter.getFacets('project_id');

    const projectCAGMap = new Map();
    const projectAnalysisMap = new Map();
    projectCAG.forEach((bucket) => {
      projectCAGMap.set(bucket.key, bucket.doc_count);
    });
    projectAnalysis.forEach((bucket) => {
      projectAnalysisMap.set(bucket.key, bucket.doc_count);
    });

    projects.forEach((project) => {
      project.stat = {
        model_count: projectCAGMap.get(project.id) || 0,
        data_analysis_count: projectAnalysisMap.get(project.id) || 0,
      };
    });
    res.json(projects);
  })
);

/* POST Create new project */
router.post(
  '/',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const baseId = req.body.baseId;
    const projectName = req.body.projectName;
    const projectDescription = req.body.projectDescription;
    const result = await projectService.createProject(baseId, projectName, projectDescription);

    res.json(result);
  })
);

/* GET Retrieve single project summary */
router.get(
  '/:projectId',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const result = await projectService.findProject(projectId);

    const cagAdapter = Adapter.get(RESOURCE.MODEL);
    const analysisAdapter = Adapter.get(RESOURCE.ANALYSIS);

    const projectCAG = await cagAdapter.getFacets('project_id', [
      { field: 'project_id', value: projectId },
    ]);
    const projectAnalysis = await analysisAdapter.getFacets('project_id', [
      { field: 'project_id', value: projectId },
    ]);

    result.stats = {
      model_count: _.isEmpty(projectCAG) ? 0 : projectCAG[0].doc_count,
      data_analysis_count: _.isEmpty(projectAnalysis) ? 0 : projectAnalysis[0].doc_count,
    };

    res.json(result);
  })
);

router.put(
  '/:projectId/metadata',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const payload = req.body.metadata;

    projectService.updateProject(projectId, payload);

    const editTime = Date.now();
    res.status(200).send({ updateToken: editTime });
  })
);

router.put(
  '/:projectId',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const ids = req.body.ids;
    const payload = req.body.payload;

    //
    // PUT Update INDRA data
    //
    // Must have updateType, if obj/subj specified must have newValue
    if (
      !payload.updateType ||
      (!_.isEmpty(payload.subj) && !payload.subj.newValue) ||
      (!_.isEmpty(payload.obj) && !payload.obj.newValue)
    ) {
      throw new Error(`Invalid update config ${JSON.stringify(payload)}`);
    }
    const batchId = await updateService.updateStatements(projectId, payload, ids);

    // Send a background request to check if CAGs under the projects are stale
    const unaffectedCurations = ['vet_statement', 'factor_polarity'];
    if (!unaffectedCurations.includes(payload.updateType)) {
      cagService.checkStaleCAGs(projectId, ids).catch(function handleError(err) {
        Logger.warn(`Error checking CAG staleness under project ${projectId} ` + err);
      });
    }

    // Bust project's graph cache if update changes the topology
    if (
      ['discard_statement', 'factor_grounding', 'reverse_relation'].includes(payload.updateType)
    ) {
      projectService.bustProjectGraphCache(projectId);
    }

    const editTime = Date.now();
    res.status(200).send({ updateToken: editTime, batchId });
  })
);

/* DELETE project */
router.delete(
  '/:projectId',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const timestamp = Date.now();
    await projectService.deleteProject(projectId);
    res.status(200).send({ updateToken: timestamp });
  })
);

router.get(
  '/:projectId/health',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const result = await projectService.checkIndexStatus(req.params.projectId);
    res.json({
      indexStatus: result.status,
    });
  })
);

/* GET INDRA statements */
router.get(
  '/:projectId/statements',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const q = req.query;
    const filters = filtersUtil.parse(q.filters);
    const sort = q.sort ? JSON.parse(q.sort) || {} : {};
    const from = +q.from || null;
    const size = +q.size || null;

    const options = { from, size, sort };
    if (!_.isNil(q.documents)) options.withDocuments = 1;

    const results = await projectService.findProjectStatements(projectId, filters, options);
    res.json(results);
  })
);

/* GET Documents (summary) */
router.get(
  '/:projectId/documents',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const q = req.query;
    const filters = filtersUtil.parse(q.filters);
    const from = +q.from || null;
    const size = +q.size || null;

    const documents = await projectService.findProjectDocuments(projectId, filters, {
      from: from,
      size: size,
    });
    res.json(documents);
  })
);

/* GET Map locations */
router.get(
  '/:projectId/locations',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const q = req.query;
    const filters = filtersUtil.parse(q.filters);

    const locations = await projectService.findProjectLocations(projectId, filters);
    res.json(locations);
  })
);

/* GET Graph */
router.get(
  '/:projectId/graphs',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
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
  })
);

/* GET project's edges */
router.get(
  '/:projectId/edges',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const filters = filtersUtil.parse(req.query.filters);
    const edges = await projectService.getProjectEdges(projectId, filters);
    res.json(edges);
  })
);

/* POST Retrieve statement ids given a set of edges and filters */
router.post(
  '/:projectId/edge-data',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const edges = req.body.edges; // Format: [{ source: "wm/concept/causal_factor/social_and_political/government/tax_duty", target:"wm/concept/causal_factor/economic_and_commerce/economic_activity/market/assets" }, { source: "..", target: ".." }]
    const filters = filtersUtil.parse(req.body.filters);

    const results = await projectService.findProjectStatementsByEdges(projectId, filters, edges);
    res.json(results);
  })
);

/* GET stats for evidence, documents, statements */
router.get(
  '/:projectId/count-stats',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const q = req.query;
    const filters = filtersUtil.parse(q.filters);

    const countStats = await projectService.countStats(projectId, filters);
    res.json(countStats);
  })
);

const _parseFacetList = (req) => {
  let facetList = [];
  if (req.query.facets) {
    facetList = JSON.parse(req.query.facets);
  }
  return facetList;
};

/* GET facet aggregations */
router.get(
  '/:projectId/facets',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const q = req.query;
    const facetFields = _parseFacetList(req);
    const filters = filtersUtil.parse(q.filters);

    const facetsResult = await projectService.facets(projectId, filters, facetFields);
    res.json(facetsResult);
  })
);

/* GET Ontology definitions */
router.get(
  '/:projectId/ontology-definitions',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const definitions = await projectService.getOntologyDefinitions(projectId);
    res.json(definitions);
  })
);

/**
 * POST Get INDRA statements scores
 * Scores are bloated and seldomly used, so we make it a separate endpoint
 **/
router.post(
  '/:projectId/statements-scores',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const ids = req.body.ids;
    const results = await projectService.getProjectStatementsScores(projectId, ids);
    res.json(results);
  })
);

/**
 * GET search for concepts for a given project
 * This is different than regular suggestions as it involves a multi-step process
 * to recontruct a concept object/document
 */
router.get(
  '/:projectId/concept-suggestions',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const queryString = req.query.q;
    const useEstimate = !_.isEmpty(req.query.estimate);
    const results = await searchService.statementConceptEntitySearch(
      projectId,
      queryString,
      useEstimate
    );
    res.json(results);
  })
);

/**
 * GET Search fields based on partial matches
 **/
router.get(
  '/:projectId/suggestions',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const field = req.query.field;
    const queryString = req.query.q;
    let results = null;
    results = await projectService.searchFields(projectId, field, queryString);

    // FIXME: These fields are array fields and do not
    // aggregate. We need to use nested or use es-native suggestion api.
    // This is a quick hack to attemp to clean the results
    const arrayFields = ['docLocation', 'docOrganization', 'docByodTag', 'docLabel'];
    if (arrayFields.includes(field)) {
      const tokens = queryString
        .toLowerCase()
        .split(' ')
        .filter((d) => d.length > 0);
      results = results.filter((d) => {
        for (let i = 0; i < tokens.length; i++) {
          if (d.toLowerCase().includes(tokens[i]) === false) {
            return false;
          }
        }
        return true;
      });
    }

    res.json(results);
  })
);

/**
 * GET Search path between source and target nodes
 */
router.get(
  '/:projectId/path-suggestions',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const source = req.query.source;
    const target = req.query.target;
    const hops = req.query.hops || 2;
    const result = await projectService.searchPath(projectId, source, target, hops);
    res.json(result);
  })
);

/**
 * POST Search path between source and target node sets
 */
router.post(
  '/:projectId/group-path-suggestions',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const sources = req.body.sources;
    const targets = req.body.targets;
    const hops = req.query.hops || 2;
    const result = await projectService.groupSearchPath(projectId, sources, targets, hops);
    res.json(result);
  })
);

/**
 * GET Given a subject-concept and object-concept, grab the compositional constituents
 */
router.get(
  '/:projectId/ontology-composition',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const concept = req.query.concept;

    const result = await projectService.ontologyComposition(projectId, concept);
    res.json(result);
  })
);

/**
 * POST Log reader status and submit a reassembly request
 */
router.post(
  '/:projectId/assembly',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const records = req.body.records;
    const timestamp = req.body.timestamp;

    const projectionId = await projectService.addReaderOutput(projectId, records, timestamp);
    // Send signal to kick start incremental knowledge ingestion process
    const result = await projectService.requestAssembly(projectionId);
    res.json(result);
  })
);

/**
 * POST a new concept into project specific ontology
 */
router.post(
  '/:projectId/ontology-concept',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const { definition, examples, label } = req.body;

    Logger.info(`Adding concept ${label} to ontology for project ${projectId}`);

    const ontology = Adapter.get(RESOURCE.ONTOLOGY);
    const doc = await ontology.findOne(
      [
        { field: 'label', value: label },
        { field: 'project_id', value: projectId },
      ],
      {}
    );

    const payload = {
      label,
      project_id: projectId,
      examples: examples || [],
      definition: definition || '',
    };

    if (doc) {
      payload.id = doc.id;
      await ontology.update([payload], (d) => d.id);
    } else {
      payload.id = uuid();
      await ontology.insert([payload], (d) => d.id);
    }

    res.json({});
  })
);

module.exports = router;
