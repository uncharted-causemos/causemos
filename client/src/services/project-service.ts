import API from '@/api/api';
import { startPolling, Poller } from '@/api/poller';
import { Filters, FiltersOptions } from '@/types/Filters';
import { ReaderOutputRecord } from '@/types/Dart';
import { SourceTargetPair } from '@/types/CAG';
import { Statement } from '@/types/Statement';
import filtersUtil from '@/utils/filters-util';

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
  const result = await API.get(`projects/${projectId}/ontology-composition`, {
    params: { concept: concept },
  });
  return result.data;
};

const getProjectFacetsPromise = async (projectId: string, facets: string[], filters: Filters) => {
  return API.get(`projects/${projectId}/facets?facets=${JSON.stringify(facets)}`, {
    params: { filters: filters },
  });
};

// Create new project based on KB specified by baseId
const createProject = async (baseId: string, projectName: string, projectDescription: string) => {
  const result = await API.post('projects', {
    baseId: baseId,
    projectName: projectName,
    projectDescription: projectDescription,
  });
  const id = result.data.index;

  // Copying KB data is not instataneous, need to poll for ready state
  const taskFn = async () => {
    const status = await API.get(`projects/${id}/health`);
    return status.data.indexStatus === 'green' ? [true, status] : [false, null];
  };

  const poller = new Poller(3000, 20);
  await startPolling(poller, taskFn, null);
  return id;
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

const getProjectStats = async (projectId: string, filters: Filters) => {
  const result = await API.get(`projects/${projectId}/count-stats`, {
    params: { filters: filters },
  });
  return result.data;
};

const getProjectStatements = async (
  projectId: string,
  filters: Filters,
  options: FiltersOptions
) => {
  if (options.size && options.size > STATEMENT_LIMIT) options.size = STATEMENT_LIMIT;
  const result = await API.get(`projects/${projectId}/statements`, {
    params: {
      filters,
      ...options,
    },
  });
  return result.data;
};

const getProjectStatementsForConcepts = (
  concepts: string[],
  projectId: string
): Promise<Statement[]> => {
  const searchFilters = filtersUtil.newFilters();
  concepts.forEach((concept) => {
    filtersUtil.addSearchTerm(searchFilters, 'topic', concept, 'or', false);
  });
  return getProjectStatements(projectId, searchFilters, {
    size: STATEMENT_LIMIT,
  });
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
const getProjectStatementIdsByEdges = async (
  projectId: string,
  edges: SourceTargetPair[],
  filters: Filters
) => {
  const result = await API.post(`projects/${projectId}/edge-data`, { edges, filters: filters });
  return result.data;
};

const getProjectLocationsPromise = async (projectId: string, filters: Filters) => {
  const promise = API.get(`projects/${projectId}/locations`, {
    params: { filters: filters },
  });
  return promise;
};

const createAssemblyRequest = async (
  projectId: string,
  payload: ReaderOutputRecord[],
  timestamp: number
) => {
  const result = await API.post(`projects/${projectId}/assembly`, { records: payload, timestamp });
  return result.data;
};

const addNewConceptToOntology = async (
  projectId: string,
  label: string,
  examples: string[],
  definition: string
) => {
  const result = await API.post(`projects/${projectId}/ontology-concept`, {
    label,
    examples,
    definition,
  });
  return result.data;
};

const getConceptSuggestions = async (
  projectId: string,
  q: string,
  useEstimate: boolean | undefined = undefined
) => {
  const result = await API.get(`projects/${projectId}/concept-suggestions`, {
    params: { q, estimate: useEstimate },
  });
  return result.data;
};

/**
 * Find suggested terms for the specified string, looking in the provided field
 *
 * @param {string} projectId
 * @param {string} field - field which should be searched
 * @param {string} queryString - string to use to get suggestions
 */
const getSuggestions = async (projectId: string, field: string, queryString: string) => {
  const { data } = await API.get(`projects/${projectId}/suggestions`, {
    params: { field, q: queryString },
  });
  return data;
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
  updateProjectMetadata,

  getProjectStats,
  getProjectStatements,
  getProjectStatementsForConcepts,
  getProjectGraph,
  getProjectEdges,
  getProjectStatementIdsByEdges,
  getProjectLocationsPromise,

  addNewConceptToOntology,

  createAssemblyRequest,

  getConceptSuggestions,
  getSuggestions,

  STATEMENT_LIMIT,
};
