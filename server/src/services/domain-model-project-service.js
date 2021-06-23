const moment = require('moment');
const uuid = require('uuid');
const Logger = rootRequire('/config/logger');
const es = rootRequire('adapters/es/adapter');

const Adapter = es.Adapter;
const RESOURCE = es.RESOURCE;

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
  // eslint-disable-next-line camelcase
  published_instances,
  // eslint-disable-next-line camelcase
  registered_instances) => {
  const newId = uuid();
  Logger.info('Creating project entry: ' + newId);
  const domainModelProjectConnection = Adapter.get(RESOURCE.DOMAIN_MODEL_PROJECT);
  const keyFn = (doc) => {
    return doc.id;
  };
  await domainModelProjectConnection.insert({
    id: newId,
    name,
    description,
    modified_at: moment().valueOf(),
    source,
    published_instances,
    registered_instances
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
  const domainModelProjectConnection = Adapter.get(RESOURCE.DOMAIN_MODEL_PROJECT);

  const keyFn = (doc) => {
    return doc.id;
  };

  const results = await domainModelProjectConnection.update({
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
  const domainModelProjectConnection = Adapter.get(RESOURCE.DOMAIN_MODEL_PROJECT);
  const searchFilters = [];
  const results = await domainModelProjectConnection.find(searchFilters, { size: 50 });
  return results;
};

/**
 * Returns a project
 */
const getProject = async (projectId) => {
  const domainModelProjectConnection = Adapter.get(RESOURCE.DOMAIN_MODEL_PROJECT);
  const result = await domainModelProjectConnection.findOne([{ field: 'id', value: projectId }], {});
  return result;
};

/**
 * Remove specific project
 *
 * @param {string} projectId - the project id
 */
const remove = async (projectId) => {
  const domainModelProjectConnection = Adapter.get(RESOURCE.DOMAIN_MODEL_PROJECT);
  const stats = await domainModelProjectConnection.remove([{ field: 'id', value: projectId }]);
  return stats;
};


module.exports = {
  createProject,
  getAllProjects,
  getProject,
  remove,
  updateProject
};
