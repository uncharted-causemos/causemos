const Logger = require('#@/config/logger.js');
const { Adapter, RESOURCE } = require('#@/adapters/es/adapter.js');
const questionService = require('#@/services/question-service.js');

const MAX_NUMBER_PROJECTS = 100;
const DEFAULT_QUESTIONS = [
  'Which countries should be prioritized for _____?',
  'How does the prioritization change over time?',
  'How does adding or removing  factors like _____ or _____ affect the prioritization? Short term? Long term?',
];

/**
 * Returns projects summary
 */
const listProjects = async () => {
  const project = Adapter.get(RESOURCE.PROJECT);
  return project.find(
    {},
    {
      size: MAX_NUMBER_PROJECTS,
      sort: { modified_at: { order: 'desc' } },
    }
  );
};

/**
 * Returns a specified project
 */
const findProject = async (projectId) => {
  const project = Adapter.get(RESOURCE.PROJECT);
  return project.findOne([{ field: 'id', value: projectId }], {});
};

/**
 * Creates a new project metadata entry.
 * Returns immedately with the new index identifier.
 *
 * @param {string} name - the human-friendly new index name
 * @param {string} description - description of the project
 */
const createProject = async (name, description) => {
  const projectAdapter = Adapter.get(RESOURCE.PROJECT);
  const projectId = await projectAdapter.create(name, description);
  // Create default questions within the new project
  const promises = DEFAULT_QUESTIONS.map((question) =>
    questionService.createQuestion(
      question,
      '',
      'private',
      projectId,
      undefined,
      undefined,
      '',
      [],
      null,
      null,
      [],
      {}
    )
  );
  await Promise.all(promises);
  return projectId;
};

/**
 * Updates a project info
 *
 * @param {string} projectId - project id
 * @param {object} projectFields - project fields
 */
const updateProject = async (projectId, projectFields) => {
  const project = Adapter.get(RESOURCE.PROJECT);

  const keyFn = (doc) => {
    return doc.id;
  };

  const results = await project.update(
    {
      id: projectId,
      ...projectFields,
    },
    keyFn
  );

  if (results.errors) {
    throw new Error(JSON.stringify(results.items[0]));
  }

  return results;
};

/**
 * Check health, used to check index is ready after cloning
 */
const checkIndexStatus = async (projectId) => {
  const project = Adapter.get(RESOURCE.PROJECT);
  const r = await project.health(projectId);
  return r;
};

/**
 * Cascade deletion of project and its resources
 *
 * @param {string} projectId - project identifier
 */
const deleteProject = async (projectId) => {
  Logger.info('Deleting project');
  let response = null;

  const projectAdapter = Adapter.get(RESOURCE.PROJECT);

  // Analysis
  const analysisAdapter = Adapter.get(RESOURCE.ANALYSIS);
  // misc
  const insightAdapter = Adapter.get(RESOURCE.INSIGHT);
  const questionAdapter = Adapter.get(RESOURCE.QUESTION);

  // Clean up project entry
  Logger.info(`Deleting ${projectId} metadata`);
  response = await projectAdapter.remove([{ field: 'id', value: projectId }]);
  Logger.info(JSON.stringify(response));

  // Clean up analysis
  Logger.info(`Deleting ${projectId} analyses`);
  response = await analysisAdapter.remove([{ field: 'project_id', value: projectId }]);
  Logger.info(JSON.stringify(response));

  // Remove project's insights
  Logger.info(`Deleting ${projectId} insights`);
  response = await insightAdapter.remove([{ field: 'project_id', value: projectId }]);
  Logger.info(JSON.stringify(response));

  // Remove project's questions
  Logger.info(`Deleting ${projectId} questions`);
  response = await questionAdapter.remove([{ field: 'project_id', value: projectId }]);
  Logger.info(JSON.stringify(response));
};

module.exports = {
  listProjects,
  findProject,
  createProject,
  checkIndexStatus,
  deleteProject,
  updateProject,
};
