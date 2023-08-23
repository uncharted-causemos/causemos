import API from '@/api/api';
import { Filters } from '@/types/Filters';

const PROJECT_LIMIT = 500;
const STATEMENT_LIMIT = 10000;

const getProjects = async () => {
  const result = await API.get('projects', { params: { size: PROJECT_LIMIT } });
  return result.data;
};

const getProject = async (projectId: string) => {
  const result = await API.get(`projects/${projectId}`);
  return result.data;
};

const getProjectFacetsPromise = async (projectId: string, facets: string[], filters: Filters) => {
  return API.get(`projects/${projectId}/facets?facets=${JSON.stringify(facets)}`, {
    params: { filters: filters },
  });
};

/**
 * @returns the new project's unique identifier
 */
const createProject = async (projectName: string, projectDescription: string): Promise<string> => {
  const response = await API.post('projects', {
    projectName: projectName,
    projectDescription: projectDescription,
  });

  return response.data;
};

const deleteProject = async (projectId: string) => {
  const result = await API.delete(`projects/${projectId}`);
  return result.data;
};

/**
 * Update a project with given ID
 * @param {string} projectId Project ID
 * @param {string} description project description
 */
const updateProjectMetadata = async (projectId: string, metadata: any) => {
  const result = await API.put(`/projects/${projectId}/metadata`, {
    metadata,
  });
  return result.data;
};

export default {
  getProjects,
  getProject,
  getProjectFacetsPromise,
  createProject,
  deleteProject,
  updateProjectMetadata,

  STATEMENT_LIMIT,
};
