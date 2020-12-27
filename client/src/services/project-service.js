import API from '@/api/api';
import { startPolling } from '@/api/poller';

const KB_LIMIT = 200;
const PROJECT_LIMIT = 500;

const getKBs = async () => {
  const result = await API.get('kbs', { params: { size: KB_LIMIT } });
  return result.data;
};

const getProjects = async () => {
  const result = await API.get('projects', { params: { size: PROJECT_LIMIT } });
  return result.data;
};

// Create new project based on KB specified by baseId
const createProject = async (baseId, projectName, projectDescrption) => {
  const result = await API.post('projects', {
    baseId: baseId,
    projectName: projectName,
    description: projectDescrption
  });
  const id = result.data.index;

  // Copying KB data is not instataneous, need to poll for ready state
  const taskFn = async () => {
    const status = await API.get(`projects/${id}/health`);
    return status.data.indexStatus === 'green' ? [true, status] : [false, null];
  };
  const pollerConfig = {
    interval: 2000,
    threshold: 10
  };
  await startPolling(taskFn, pollerConfig);
  return id;
};

const deleteProject = async (projectId) => {
  const result = await API.delete(`projects/${projectId}`).then(() => {
    return result.data;
  });
};

const getProjectStats = async (projectId, filters = null) => {
  const result = await API.get(`projects/${projectId}/count-stats`, { params: { filters: filters } });
  return result.data;
};

const getProjectStatements = async (projectId, filters, options) => {
  const result = await API.get(`projects/${projectId}/statements`, {
    params: {
      filters,
      ...options
    }
  });
  return result.data;
};

export default {
  getKBs,
  getProjects,
  createProject,
  deleteProject,

  getProjectStats,
  getProjectStatements
};

