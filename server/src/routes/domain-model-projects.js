
const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

const domainModelProjectService = rootRequire('/services/domain-model-project-service');

/**
 * POST commit for a new project
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    name,
    description,
    // modified_at -> automatically added inside the function createProject()
    source,
    published_instances,
    registered_instances
  } = req.body;
  const result = await domainModelProjectService.createProject(
    name,
    description,
    source,
    published_instances,
    registered_instances);
  res.json(result);
}));

/**
 * PUT update an existing project
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  await domainModelProjectService.updateProject(projectId, req.body);
  res.status(200).send({});
}));

/**
 * GET a list of insights
 */
router.get('/', asyncHandler(async (req, res) => {
  const result = await domainModelProjectService.getAllProjects();
  res.json(result);
}));

/**
 * GET by id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const result = await domainModelProjectService.getProject(projectId);
  res.status(200);
  res.json(result);
}));

/**
 * DELETE existing project
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const projectId = req.params.id;
  const result = await domainModelProjectService.remove(projectId);
  res.status(200);
  res.json(result);
}));

module.exports = router;
