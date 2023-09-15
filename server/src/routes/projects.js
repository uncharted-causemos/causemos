const _ = require('lodash');
const express = require('express');
const asyncHandler = require('express-async-handler');

const { Adapter, RESOURCE } = require('#@/adapters/es/adapter.js');
const projectService = require('#@/services/project-service.js');

const router = express.Router();

/* Keycloak Authentication */
// const authUtil = require('#@/util/auth-util.js);

/* GET Retrieve projects */
router.get(
  '/',
  // authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projects = await projectService.listProjects();

    const analysisAdapter = Adapter.get(RESOURCE.ANALYSIS);

    // Get number of data-analysis
    const projectAnalysis = await analysisAdapter.getFacets('project_id');
    const projectAnalysisMap = new Map();
    projectAnalysis.forEach((bucket) => {
      projectAnalysisMap.set(bucket.key, bucket.doc_count);
    });

    projects.forEach((project) => {
      project.stat = {
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
    const projectName = req.body.projectName;
    const projectDescription = req.body.projectDescription;
    const result = await projectService.createProject(projectName, projectDescription);

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

    const analysisAdapter = Adapter.get(RESOURCE.ANALYSIS);

    const projectAnalysis = await analysisAdapter.getFacets('project_id', [
      { field: 'project_id', value: projectId },
    ]);

    result.stats = {
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

module.exports = router;
