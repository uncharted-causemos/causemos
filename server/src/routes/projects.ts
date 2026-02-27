import _ from 'lodash';
import express from 'express';
import asyncHandler from 'express-async-handler';
import { Adapter, RESOURCE } from '#@/adapters/es/adapter.js';
import * as projectService from '#@/services/project-service.js';
import * as authUtil from '#@/util/auth-util.js';

const router = express.Router();

/* GET Retrieve projects */
router.get(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projects = await projectService.listProjects();

    const analysisAdapter = Adapter.get(RESOURCE.ANALYSIS);

    // Get number of data-analysis
    const projectAnalysis = await analysisAdapter.getFacets('project_id');
    const projectAnalysisMap = new Map();
    projectAnalysis.forEach((bucket: any) => {
      projectAnalysisMap.set(bucket.key, bucket.doc_count);
    });

    projects.forEach((project: any) => {
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
  authUtil.checkRole([authUtil.ROLES.USER]),
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
  authUtil.checkRole([authUtil.ROLES.USER]),
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
  authUtil.checkRole([authUtil.ROLES.USER]),
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
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId;
    const timestamp = Date.now();
    await projectService.deleteProject(projectId);
    res.status(200).send({ updateToken: timestamp });
  })
);

router.get(
  '/:projectId/health',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const result = await projectService.checkIndexStatus(req.params.projectId);
    res.json({
      indexStatus: result.status,
    });
  })
);

export default router;
