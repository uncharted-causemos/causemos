import API from '@/api/api';
import { startPolling } from '@/api/poller';
import { Filters, FiltersOptions } from '@/types/Filters';

const KB_LIMIT = 200;
const PROJECT_LIMIT = 500;
const STATEMENT_LIMIT = 10000;

const getKBs = async () => {
  const result = await API.get('kbs', { params: { size: KB_LIMIT } });
  return result.data;
};

const getProjects = async () => {
  const result = await API.get('projects', { params: { size: PROJECT_LIMIT } });
  return result.data;
};

const getProject = async (projectId: string) => {
  const result = await API.get(`projects/${projectId}`);
  return result.data;
};

const getProjectOntologyDefinitions = async (projectId: string) => {
  const result = await API.get(`projects/${projectId}/ontology-definitions`, {});
  return result.data;
};

// Take flattened concept the derive the original compositions
// e.g. WM_FOO_BAR => { WM_FOO, WM_BAR }
const getProjectOntologyComposition = async (projectId: string, concept: string) => {
  const result = await API.get(`projects/${projectId}/ontology-composition`, { params: { concept: concept } });
  return result.data;
};

const getProjectFacetsPromise = async (projectId: string, facets: string[], filters: Filters) => {
  return API.get(`projects/${projectId}/facets?facets=${JSON.stringify(facets)}`, {
    params: { filters: filters }
  });
};

// Create new project based on KB specified by baseId
const createProject = async (baseId: string, projectName: string, projectDescrption: string) => {
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

const deleteProject = async (projectId: string) => {
  const result = await API.delete(`projects/${projectId}`);
  return result.data;
};

const getProjectStats = async (projectId: string, filters: Filters) => {
  const result = await API.get(`projects/${projectId}/count-stats`, { params: { filters: filters } });
  return result.data;
};

const getProjectStatements = async (projectId: string, filters: Filters, options: FiltersOptions) => {
  if (options.size && options.size > STATEMENT_LIMIT) options.size = STATEMENT_LIMIT;
  const result = await API.get(`projects/${projectId}/statements`, {
    params: {
      filters,
      ...options
    }
  });
  return result.data;
};

const getProjectGraph = async (projectId: string, filters: Filters) => {
  const result = await API.get(`projects/${projectId}/graphs`, { params: { filters: filters } });
  return result.data;
};

// Given a filter, return the edge structure composition
// TODO: Do a more performant fetch like retrieving wm.edge instead of computing aggregating and fetching  the graph as a whole
// to better handle larger datasets - Aug 25
const getProjectEdges = async (projectId: string, filters: Filters) => {
  const result = await API.get(`projects/${projectId}/edges`, { params: { filters: filters } });
  return result.data;
};

// Given a list of source/target pair and filters, get corresponding statements
interface Edge {
  source: string;
  target: string;
}
const getProjectStatementIdsByEdges = async (projectId: string, edges: Edge[], filters: Filters) => {
  const result = await API.post(`projects/${projectId}/edge-data`, { edges, filters: filters });
  return result.data;
};

const getProjectLocationsPromise = async (projectId: string, filters: Filters) => {
  const promise = API.get(`projects/${projectId}/locations`, {
    params: { filters: filters }
  });
  return promise;
};

export default {
  getKBs,
  getProjects,
  getProject,
  getProjectOntologyDefinitions,
  getProjectOntologyComposition,
  getProjectFacetsPromise,
  createProject,
  deleteProject,

  getProjectStats,
  getProjectStatements,
  getProjectGraph,
  getProjectEdges,
  getProjectStatementIdsByEdges,
  getProjectLocationsPromise,

  STATEMENT_LIMIT
};

