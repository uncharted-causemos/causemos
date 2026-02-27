import { v4 as uuid } from 'uuid';
import Logger from '#@/config/logger.js';
import * as es from '#@/adapters/es/adapter.js';
import { client } from '#@/adapters/es/client.js';

const { Adapter, RESOURCE } = es;

const MAX_NUMBER_PROJECTS = 100;

/**
 * Wrapper to create a new domain project.
 */
export const createProject = async (
  name: string,
  description: string,
  website: string,
  maintainer: any,
  type: string
) => {
  const newId = uuid();
  Logger.info('Creating domain project entry: ' + newId);
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);
  const keyFn = (doc: any) => {
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
 */
export const updateProject = async (projectId: string, projectFields: any) => {
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);

  const keyFn = (doc: any) => {
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
export const getAllProjects = async (filterParams?: any) => {
  const searchFilters = getFilterFields(filterParams);
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);
  const results = await domainProjectConnection.find(searchFilters, { size: MAX_NUMBER_PROJECTS });
  return results;
};

/**
 * Returns a project
 */
export const getProject = async (projectId: string) => {
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);
  const result = await domainProjectConnection.findOne([{ field: 'id', value: projectId }], {});
  return result;
};

/**
 * Remove specific project
 */
export const remove = async (projectId: string) => {
  const domainProjectConnection = Adapter.get(RESOURCE.DOMAIN_PROJECT);
  const stats = await domainProjectConnection.remove([{ field: 'id', value: projectId }]);
  return stats;
};

/**
 * Review all domain projects and creates a new one if needed
 * @param {*} metadata datacube metadata
 */
export const updateDomainProjects = async (metadata: any) => {
  const familyName = metadata.family_name || metadata.name || uuid();
  const existingProjects = await getAllProjects({ name: familyName });
  const modelFamilyNames = existingProjects.map((p: any) => p.name);

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

export const getFilterFields = (filterParams?: any) => {
  if (!filterParams) {
    return [];
  }

  const supportedSearchFields = ['type', 'name'];
  const searchFilters: any[] = [];
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
export const getDomainProjectStatistics = async () => {
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
  const result: Record<string, any> = {};
  const domainProjects = response.body.aggregations.family.buckets;
  for (let i = 0; i < domainProjects.length; i++) {
    const statusObj: Record<string, number> = {};
    const statusList = domainProjects[i].status.buckets;
    for (let j = 0; j < statusList.length; j++) {
      statusObj[statusList[j].key] = statusList[j].doc_count;
    }
    result[domainProjects[i].key] = statusObj;
  }
  return result;
};
