import API from '@/api/api';

const PROJECT_LIMIT = 500;

const getProjects = async () => {
  const result = await API.get('projects', { params: { size: PROJECT_LIMIT } });
  return result.data;
};

const getProject = async (projectId: string) => {
  const result = await API.get(`projects/${projectId}`);
  return result.data;
};

/**
 * @returns the new project's unique identifier
 */
const createProject = async (projectName: string, projectDescription: string): Promise<string> => {
  const response = await API.post('projects', {
    projectName,
    projectDescription,
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
  createProject,
  deleteProject,
  updateProjectMetadata,
};
