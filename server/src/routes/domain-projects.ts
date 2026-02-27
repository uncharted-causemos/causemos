import express from 'express';
import asyncHandler from 'express-async-handler';
import * as domainProjectService from '#@/services/domain-project-service.js';
import * as authUtil from '#@/util/auth-util.js';

const router = express.Router();

/**
 * POST commit for a new domain project
 */
router.post(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const { name, description, website, maintainer, type } = req.body;
    const result = await domainProjectService.createProject(
      name,
      description,
      website,
      maintainer,
      type
    );

    res.json(result);
  })
);

/**
 * PUT update an existing project
 */
router.put(
  '/:id',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.id;
    await domainProjectService.updateProject(projectId, req.body);
    res.status(200).send({});
  })
);

/**
 * GET a list of domain projects
 */
router.get(
  '/',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const filterParams = req.query;
    const result = await domainProjectService.getAllProjects(filterParams);
    res.json(result);
  })
);

/**
 * GET domain project stats
 */
router.get(
  '/stats',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const result = await domainProjectService.getDomainProjectStatistics();
    res.json(result);
  })
);

/**
 * GET project by id
 */
router.get(
  '/:id',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.id;
    const result = await domainProjectService.getProject(projectId);
    res.status(200);
    res.json(result);
  })
);

/**
 * DELETE existing project
 */
router.delete(
  '/:id',
  authUtil.checkRole([authUtil.ROLES.USER]),
  asyncHandler(async (req, res) => {
    const projectId = req.params.id;
    const result = await domainProjectService.remove(projectId);
    res.status(200);
    res.json(result);
  })
);

export default router;
