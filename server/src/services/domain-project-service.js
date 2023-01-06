const { v4: uuid } = require('uuid');
const Logger = rootRequire('/config/logger');
const es = rootRequire('adapters/es/adapter');
const { client } = rootRequire('/adapters/es/client');

const Adapter = es.Adapter;
const RESOURCE = es.RESOURCE;

const MAX_NUMBER_PROJECTS = 100;

/**
 * Wrapper to create a new domain project.
 */
const createProject = async (name, description, website, maintainer, type) => {
  const newId = uuid();
  Logger.info('Creating domain project entry: ' + newId);
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);
  const keyFn = (doc) => {
    return doc.id; // prevent duplicate doc based on the id field
  };
  await domainProjectConnection.insert(
    {
      id: newId,
      name,
      description,
      modified_at: Date.now(),
      website,
      maintainer,
      type,
    },
    keyFn
  );

  // Acknowledge success
  return { id: newId };
};

/**
 * Updates a project info
 *
 * @param {string} projectId - project id
 * @param {object} projectFields - project fields
 */
const updateProject = async (projectId, projectFields) => {
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);

  const keyFn = (doc) => {
    return doc.id;
  };

  const results = await domainProjectConnection.update(
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

  const familyName = metadata.family_name || metadata.name || uuid();
  const existingProjects = await getAllProjects({ name: familyName });
  const modelFamilyNames = existingProjects.map((p) => p.name);

  if (!modelFamilyNames.includes(familyName)) {
    await createProject(
      familyName,
      metadata.description,
      '', // website
      [metadata.maintainer],
      metadata.type
    );
  }
};

const getFilterFields = (filterParams) => {
  if (!filterParams) {
    return [];
  }

  const supportedSearchFields = ['type', 'name'];
  const searchFilters = [];
  supportedSearchFields.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(filterParams, key)) {
      searchFilters.push({
        field: key,
        value: filterParams[key],
      });
    }
  });
  return searchFilters;
};

// Returns a map of how many datacubes/indicators are registered/published per domain project
const getDomainProjectStatistics = async () => {
  const response = await client.search({
    index: RESOURCE.DATA_DATACUBE,
    body: {
      size: 0,
      aggs: {
        family: {
          terms: {
            field: 'family_name.raw',
            size: 1000,
          },
          aggs: {
            status: {
              terms: {
                field: 'status',
              },
            },
          },
        },
      },
    },
  });

  // Make lookup map
  const result = {};
  const domainProjects = response.body.aggregations.family.buckets;
  for (let i = 0; i < domainProjects.length; i++) {
    const statusObj = {};
    const statusList = domainProjects[i].status.buckets;
    for (let j = 0; j < statusList.length; j++) {
      statusObj[statusList[j].key] = statusList[j].doc_count;
    }
    result[domainProjects[i].key] = statusObj;
  }
  return result;
};

module.exports = {
  createProject,
  getAllProjects,
  getProject,
  remove,
  updateProject,
  updateDomainProjects,
  getDomainProjectStatistics,
};
