import API from '@/api/api';
import { Filters } from '@/types/Filters';

const PROJECT_LIMIT = 500;

const getProjects = async (filters: Filters) => {
  const result = await API.get('domain-projects', { params: { filters: filters, size: PROJECT_LIMIT } });
  return result.data;
};

const getProject = async (projectId: string) => {
  const result = await API.get(`domain-projects/${projectId}`);
  return result.data;
};

const updateDomainProject = async (projectId: string, fields: { [key: string]: any }) => {
  const result = await API.put(`domain-projects/${projectId}`, fields);
  return result.data;
};

const deleteProject = async (projectId: string) => {
  const result = await API.delete(`domain-projects/${projectId}`);
  return result.data;
};


export default {
  getProjects,
  getProject,
  deleteProject,
  updateDomainProject
};

