const { v4: uuid } = require('uuid');
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
    return doc.id; // prevent duplicate doc based on the id field
  };
  await domainProjectConnection.insert({
    id: newId,
    name,
    description,
    modified_at: Date.now(),
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
const getAllProjects = async (filterParams) => {
  const searchFilters = getFilterFields(filterParams);
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);
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

/**
 * Review all domain projects and creates a new one if needed
 * @param {*} metadata datacube metadata
 */
const updateDomainProjects = async (metadata) => {
  // check if there is an existing (domain) project that match the current metadata
  // ideally, there shouldn't be such a project since this function would only be called once on the registration of a new indicator family
  // if such a project already exist, we probably should overwrite it

  const instanceName = metadata.name;
  const familyName = metadata.family_name || metadata.name || uuid();

  const existingProjects = await getAllProjects({ name: familyName });
  const modelFamilyNames = existingProjects.map(p => p.name);

  if (!modelFamilyNames.includes(familyName)) {
    await createProject(
      familyName,
      metadata.description,
      metadata.maintainer.organization,
      metadata.type,
      [], // initial stats need to be set // ready_instances
      [instanceName]); // initial stats need to be set // draft_instances
  } else {
    //
    // update the count of draft_instances
    //  (since another instance of the same family is being registered)
    //
    const matchingExistingProject = existingProjects.find(p => p.name === familyName);
    if (matchingExistingProject) {
      if (metadata.status === 'REGISTERED' && !matchingExistingProject.draft_instances.includes(instanceName)) {
        // this is a new model instance datacube, so we need to increase the registered instances of this project
        matchingExistingProject.draft_instances.push(instanceName);

        await updateProject(
          matchingExistingProject.id,
          { draft_instances: matchingExistingProject.draft_instances });
      }
    }
  }
};

const getFilterFields = (filterParams) => {
  if (!filterParams) {
    return [];
  }

  const supportedSearchFields = [
    'type',
    'name'
  ];
  const searchFilters = [];
  supportedSearchFields.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(filterParams, key)) {
      searchFilters.push({
        field: key,
        value: filterParams[key]
      });
    }
  });
  return searchFilters;
};


module.exports = {
  getAllProjects,
  getProject,
  remove,
  updateProject,
  updateDomainProjects
};
