import API from '@/api/api';

export interface DomainProjectFilterFields {
  type?: string;
  name?: string;
}

const getProjects = async (fetchParams: DomainProjectFilterFields) => {
  const result = await API.get('domain-projects', { params: fetchParams });
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

