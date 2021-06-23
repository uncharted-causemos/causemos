import API from '@/api/api';

const PROJECT_LIMIT = 500;

const getProjects = async () => {
  const result = await API.get('domain-model-projects', { params: { size: PROJECT_LIMIT } });
  return result.data;
};

const getProject = async (projectId: string) => {
  const result = await API.get(`domain-model-projects/${projectId}`);
  return result.data;
};

const createDomainModelProject = async (projectName: string, projectDescription: string, modelSource: string, published_instances: string[] = [], registered_instances: string[] = []) => {
  const result = await API.post('domain-model-projects', {
    name: projectName,
    description: projectDescription,
    source: modelSource,
    published_instances,
    registered_instances
  });
  return result.data.id;
};

const updateDomainModelProject = async (projectId: string, fields: { [key: string]: any }) => {
  const result = await API.put(`domain-model-projects/${projectId}`, fields);
  return result.data;
};

const deleteProject = async (projectId: string) => {
  const result = await API.delete(`domain-model-projects/${projectId}`);
  return result.data;
};


export default {
  getProjects,
  getProject,
  deleteProject,
  createDomainModelProject,
  updateDomainModelProject
};

