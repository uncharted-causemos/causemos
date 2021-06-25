
const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const domainProjectService = rootRequire('/services/domain-project-service');

/**
 * POST commit for a new project
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    name,
    description,
    // modified_at -> automatically added inside the function createProject()
    source,
    type,
    ready_instances,
    draft_instances
  } = req.body;
  const result = await domainProjectService.createProject(
    name,
    description,
    source,
    type,
    ready_instances,
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
 * GET a list of insights
 */
router.get('/', asyncHandler(async (req, res) => {
  const result = await domainProjectService.getAllProjects();
  res.json(result);
}));

/**
 * GET by id
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