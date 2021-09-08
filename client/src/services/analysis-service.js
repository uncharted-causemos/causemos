import API from '@/api/api';

/**
 * Get analysis by ID
 * @param {string} analysisId Analysis Id
 */
export const getAnalysis = async (analysisId) => {
  const result = await API.get(`analyses/${analysisId}`);
  return result.data;
};

/**
 * Get the state of the analysis with given Id
 * @param {String} analysisId Analysis Id
 */
export const getAnalysisState = async (analysisId) => {
  const analysis = await getAnalysis(analysisId);
  return analysis.state || {};
};

/**
 * Saves analysis state
 * @param {string} analysisId Analysis Id
 * @param {object} state analysis state payload
 */
export const saveAnalysisState = async (analysisId, state) => {
  const result = await API.put(`analyses/${analysisId}`, { state }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return result.data;
};

/**
 * Create new Analysis resource
 * @param {object} payload Analysis payload
 * @param {string} payload.title Analysis title
 * @param {string} payload.description Analysis description
 * @param {string} payload.projectId Project Id
 */
export const createAnalysis = async({ title = '', description = '', projectId, state = {} } = {}) => {
  if (!projectId) return console.error(new Error('projectId must be provided'));
  const result = await API.post('analyses', { title, description, project_id: projectId, state }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return result.data;
};

/**
 * Update the analysis with given ID
 * @param {string} analysisId Analysis ID
 * @param {object} payload Analysis update payload
 * @param {string} [payload.title] Analysis title
 * @param {string} [payload.description] Analysis description
 */
export const updateAnalysis = async(analysisId, payload) => {
  if (!payload) return console.error(new Error('payload object must be provided'));
  const analysis = await getAnalysis(analysisId);
  const result = await API.put(`analyses/${analysisId}`, { ...analysis, ...payload }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return result.data;
};

/**
 * Get a list of analyses under given project Id
 * @param {string} projectId Project Id
 */
export const getAnalysesByProjectId = async (projectId) => {
  const result = await API.get('analyses', { params: { project_id: projectId, size: 200 } });
  return result.data || [];
};

/**
 * Create a copy of the analysis with given Id
 * @param {string} analysisId Analysis Id
 */
export const duplicateAnalysis = async (analysisId) => {
  const original = await getAnalysis(analysisId);
  const newAnalysis = await createAnalysis({
    title: `Copy of ${original.title}`,
    description: original.description,
    projectId: original.project_id
  });
  const savedState = await saveAnalysisState(newAnalysis.id, original.state);
  newAnalysis.state = savedState;
  return newAnalysis;
};

/**
 * Delete the analysis with given Id
 * @param {string} analysisId Analysis Id
 */
export const deleteAnalysis = (analysisId) => {
  return API.delete(`analyses/${analysisId}`);
};
