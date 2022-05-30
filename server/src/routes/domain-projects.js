
const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const domainProjectService = rootRequire('/services/domain-project-service');

/**
 * POST commit for an a new domain project
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    name,
    description,
    website,
    maintainer,
    type,
    // eslint-disable-next-line camelcase
    ready_instances,
    // eslint-disable-next-line camelcase
    draft_instances
  } = req.body;
  const result = await domainProjectService.createProject(
    name,
    description,
    website,
    maintainer,
    type,
    // eslint-disable-next-line camelcase
    ready_instances,
    // eslint-disable-next-line camelcase
    draft_instances);
  res.json(result);
}));

/**
 * PUT update an existing project
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  await domainProjectService.updateProject(projectId, req.body);
  res.status(200).send({});
}));

/**
 * GET a list of domain projects
 */
router.get('/', asyncHandler(async (req, res) => {
  const filterParams = req.query;
  const result = await domainProjectService.getAllProjects(filterParams);
  res.json(result);
}));

/**
 * GET domain project stats
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const result = await domainProjectService.getDomainProjectStatistics();
  res.json(result);
}));

/**
 * GET project by id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const result = await domainProjectService.getProject(projectId);
  res.status(200);
  res.json(result);
}));

/**
 * DELETE existing project
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const result = await domainProjectService.remove(projectId);
  res.status(200);
  res.json(result);
}));

module.exports = router;
