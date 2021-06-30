const moment = require('moment');
const uuid = require('uuid');
const Logger = rootRequire('/config/logger');
const es = rootRequire('adapters/es/adapter');

const Adapter = es.Adapter;
const RESOURCE = es.RESOURCE;

const MAX_NUMBER_PROJECTS = 100;

/**
 * Wrapper to create a new project.
 *
 * @param {string} projectId - project id
 * @param {string} description - insight description
 * @param {string} source - source
 */
const createProject = async (
  name,
  description,
  source,
  type,
  // eslint-disable-next-line camelcase
  ready_instances,
  // eslint-disable-next-line camelcase
  draft_instances) => {
  const newId = uuid();
  Logger.info('Creating project entry: ' + newId);
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);
  const keyFn = (doc) => {
    return doc.name; // prevent duplicate doc based on the name field instead of id
  };
  await domainProjectConnection.insert({
    id: newId,
    name,
    description,
    modified_at: moment().valueOf(),
    source,
    type,
    ready_instances,
    draft_instances
  }, keyFn);

  // Acknowledge success
  return { id: newId };
};


/**
 * Updates a project info
 *
 * @param {string} projectId - project id
 * @param {object} projectFields - project fields
 */
const updateProject = async(projectId, projectFields) => {
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);

  const keyFn = (doc) => {
    return doc.id;
  };

  const results = await domainProjectConnection.update({
    id: projectId,
    ...projectFields
  }, keyFn);

  if (results.errors) {
    throw new Error(JSON.stringify(results.items[0]));
  }

  return results;
};

/**
 * Returns a list of all projects
 */
const getAllProjects = async () => {
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);
  const searchFilters = [];
  const results = await domainProjectConnection.find(searchFilters, { size: MAX_NUMBER_PROJECTS });
  return results;
};

/**
 * Returns a project
 */
const getProject = async (projectId) => {
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);
  const result = await domainProjectConnection.findOne([{ field: 'id', value: projectId }], {});
  return result;
};

/**
 * Remove specific project
 *
 * @param {string} projectId - the project id
 */
const remove = async (projectId) => {
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);
  const stats = await domainProjectConnection.remove([{ field: 'id', value: projectId }]);
  return stats;
};


module.exports = {
  createProject,
  getAllProjects,
  getProject,
  remove,
  updateProject
};
