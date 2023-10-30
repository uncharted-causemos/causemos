import API from '@/api/api';
import { AnalyticalQuestion } from '@/types/Insight';
import _ from 'lodash';

export const getQuestionById = async (question_id: string) => {
  const result = await API.get(`questions/${question_id}`);
  return result.data;
};

export const updateQuestion = async (question_id: string, question: AnalyticalQuestion) => {
  const result = await API.put(`questions/${question_id}`, question, {
    headers: {
      'Content-Type': 'application/json',
    },
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

export const addInsightToQuestion = async (questionId: string, insightId: string) => {
  // Note: Insight update is not an atomic update. It can be rare but it's possible there might be data inconsistency resulting
  // unexpected results especially when multiple update operations on a same insight at the same time concurrently.
  // In that case, the last update received by the database will overwrite the previous ones.
  const question: AnalyticalQuestion = await getQuestionById(questionId);
  question.linked_insights = _.uniq([...question.linked_insights, insightId]);
  const result = await updateQuestion(questionId, question);
  return result;
};
export const removeInsightFromQuestion = async (questionId: string, insightId: string) => {
  // Note: Insight update is not an atomic update. It can be rare but it's possible there might be data inconsistency resulting
  // unexpected results especially when multiple update operations on a same insight at the same time concurrently.
  // In that case, the last update received by the database will overwrite the previous ones.
  const question: AnalyticalQuestion = await getQuestionById(questionId);
  question.linked_insights = _.uniq([...question.linked_insights.filter((i) => i !== insightId)]);
  const result = await updateQuestion(questionId, question);
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
export const fetchQuestions = async (fetchParamsArray: any[]) => {
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
  const allFlatResults = allRawResponses.flatMap((res) => res.data);

  return _.uniqBy(allFlatResults, 'id');
};

export default {
  getQuestionById,
  addQuestion,
  updateQuestion,
  fetchQuestions,
  addInsightToQuestion,
  removeInsightFromQuestion,
};
