import API from '@/api/api';
import { createAnalysis } from './analysis-service-new';

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
  if (analysis) return analysis.state;
  return {};
};

/**
 * Saves analysis state
 * @param {string} analysisId Analysis Id
 * @param {object} state analysis state payload
 */
export const saveAnalysisState = async (analysisId, state) => {
  const result = await API.put(
    `analyses/${analysisId}`,
    { state },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return result.data;
};

/**
 * Update the analysis with given ID
 * @param {string} analysisId Analysis ID
 * @param {object} payload Analysis update payload
 * @param {string} [payload.title] Analysis title
 * @param {string} [payload.description] Analysis description
 */
export const updateAnalysis = async (analysisId, payload) => {
  if (!payload) return console.error(new Error('payload object must be provided'));
  const analysis = await getAnalysis(analysisId);
  if (analysis) {
    const result = await API.put(
      `analyses/${analysisId}`,
      { ...analysis, ...payload },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return result.data;
  } else {
    return console.error(new Error('payload object must be provided'));
  }
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
export const duplicateAnalysis = async (analysisId, newName = undefined) => {
  const original = await getAnalysis(analysisId);
  const { id } = await createAnalysis(
    newName || `Copy of ${original.title}`,
    original.description,
    original.project_id,
    original.state
  );
  return id;
};

/**
 * Delete the analysis with given Id
 * @param {string} analysisId Analysis Id
 */
export const deleteAnalysis = (analysisId) => {
  return API.delete(`analyses/${analysisId}`);
};
