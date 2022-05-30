import API from '@/api/api';
import { DatacubeMaintainer } from '@/types/Datacube';
import { ProjectType } from '@/types/Enums';

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

const getProjectsStats = async () => {
  const result = await API.get('domain-projects/stats');
  return result.data;
};

const createProject = async (name: string, description: string, website: string, maintainer: DatacubeMaintainer[], type = ProjectType.Model, ready_instances = [], draft_instances = []) => {
  const result = await API.post('domain-projects', {
    name,
    description,
    website,
    type,
    maintainer,
    ready_instances,
    draft_instances
  });
  const id = result.data.id;
  return id;
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
  createProject,
  getProjects,
  getProject,
  getProjectsStats,
  deleteProject,
  updateDomainProject
};

