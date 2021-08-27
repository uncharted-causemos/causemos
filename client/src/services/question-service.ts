import API from '@/api/api';
import { AnalyticalQuestion } from '@/types/Insight';
import _ from 'lodash';

// FIXME: add support for analysisId field

//
// Filter fields
//

// example: get all questions related to a given project
//  if a target-view and/or context-id is provided then the result will be filtered accordingly

const getProjectSpecificFilterFields = (project_id: string, context_id?: string, target_view?: string) => {
  return {
    project_id,
    context_id,
    target_view
  };
};

// example: return all public questions that were created during DSSAT publication
//  if a target-view is provided then the result will be filtered against current view
const getPublicFilterFields = () => {
  return {
    visibility: 'public'
  };
};

const getParamsForAllQuestionsFetch = (project_id: string) => {
  return [
    // first, fetch all questions related to the current project
    getProjectSpecificFilterFields(project_id),
    // second, fetch all public questions
    getPublicFilterFields()
  ];
};

const getParamsForContextSpecificQuestionsFetch = (project_id: string, context_id: string, target_view: string) => {
  return [
    // first, fetch all questions related to the current project, and the currently loaded datacube/model-id, and filtered for current view
    getProjectSpecificFilterFields(project_id, context_id, target_view),
    // second, fetch all public questions
    getPublicFilterFields()
  ];
};

//
// Fetch question list
//

/**
 * Get all questions
 *  - questions associated with current project
 *    (private project-specific)
 *  - questions that are public
 *    (visible to all projects)
 * @param project_id project id
 * @returns the list of all questions
 */
export const getAllQuestions = async (project_id: string) => {
  const fetchParamsArray = getParamsForAllQuestionsFetch(project_id);
  return fetchQuestions(fetchParamsArray);
};

/** Get context-sensitive (local) questions
 * - questions associated with the current project, match the current view,
 *   as well as the current context-id (e.g. selected datacube/model/cag/indicator)
 * - questions that are public
 *   (saved during model publication flow AND are associated with a specific model AND match target view)
 * @param project_id project id
 * @param context_id context id
 * @param target_view target view
 * @returns the list of local (context-specific) questions
 */
export const getContextSpecificQuestions = async (project_id: string, context_id: string, target_view: string) => {
  const fetchParamsArray = getParamsForContextSpecificQuestionsFetch(project_id, context_id, target_view);
  return fetchQuestions(fetchParamsArray);
};

export const getQuestionById = async (question_id: string) => {
  const result = await API.get(`questions/${question_id}`);
  return result.data;
};

export const updateQuestion = async (question_id: string, question: AnalyticalQuestion) => {
  const result = await API.put(`questions/${question_id}`, question, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return result;
};

export const addQuestion = async (question: AnalyticalQuestion) => {
  const result = await API.post('questions', question);
  return result;
};

export const deleteQuestion = async (id: string) => {
  const result = await API.delete(`questions/${id}`);
  return result;
};

//
// Core fetch functions
//

/**
 * Fetch questions for a given array of fetch parameters
 * @param fetchParamsArray an array where each element is a combination of filter fields
 * @returns the result is a unique flat array with a union of all fetch operations
 */
const fetchQuestions = async (fetchParamsArray: any[]) => {
  // this sequential async loop works
  /*
  const allResults: Question[] = [];
  for (const fetchParams of fetchParamsArray) {
    const questions = (await API.get('questions', { params: fetchParams })).data;
    const orderedQuestions: Question[] = _.orderBy(questions, d => d.modified_at, ['desc']);
    allResults.push(...orderedQuestions);
  }
  */

  // but we may also run the loop in parallel; map the array to promises
  const promises = fetchParamsArray.map((fetchParams) => {
    return API.post('questions/search', fetchParams);
  });
  // wait until all promises are resolved
  const allRawResponses = await Promise.all(promises);
  const allFlatResults = allRawResponses.flatMap(res => res.data);

  return _.uniqBy(allFlatResults, 'id');
};

export default {
  getContextSpecificQuestions,
  getAllQuestions,
  getQuestionById,
  addQuestion,
  updateQuestion
};
