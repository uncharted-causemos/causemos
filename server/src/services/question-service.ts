import { v4 as uuid } from 'uuid';
import Logger from '#@/config/logger.js';
import * as es from '#@/adapters/es/adapter.js';

const { Adapter, RESOURCE } = es;

/**
 * Wrapper to create a new question.
 */
export const createQuestion = async (
  question: string,
  projectId: string,
  contextId: string,
  linkedInsights: any,
  viewState: any
) => {
  const newId = uuid();
  Logger.info('Creating question entry: ' + newId);
  const questionsConnection = Adapter.get(RESOURCE.QUESTION);
  const keyFn = (doc: any) => {
    return doc.id;
  };
  await questionsConnection.insert(
    {
      id: newId,
      question,
      modified_at: Date.now(),
      project_id: projectId,
      context_id: contextId,
      linked_insights: linkedInsights,
      view_state: viewState,
    },
    keyFn
  );

  // Acknowledge success
  return { id: newId };
};

/**
 * Insert an question object as a whole
 */
export const insertQuestion = async (question: any) => {
  const connection = Adapter.get(RESOURCE.QUESTION);
  return await connection.insert(question);
};

/**
 * Update an question with the specified changes
 */
export const updateQuestion = async (id: string, question: any) => {
  const connection = Adapter.get(RESOURCE.QUESTION);
  const result = await connection.update(
    {
      id: id,
      ...question,
    },
    (d: any) => d.id
  );
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
};

/**
 * Returns a list of questions
 */
export const getAllQuestions = async (
  projectId: string,
  contextId: string | undefined,
  _visibility?: string
) => {
  const questionsConnection = Adapter.get(RESOURCE.QUESTION);
  const searchFilters: any[] = [];
  if (projectId) {
    searchFilters.push({
      field: 'project_id',
      value: projectId,
    });
  }
  if (contextId !== undefined) {
    searchFilters.push({
      field: 'context_id',
      value: contextId,
    });
  }
  const results = await questionsConnection.find(searchFilters, { size: 50 });
  return results;
};

/**
 * Returns an question
 */
export const getQuestion = async (questionId: string) => {
  const questionsConnection = Adapter.get(RESOURCE.QUESTION);
  const result = await questionsConnection.findOne([{ field: 'id', value: questionId }], {});
  return result;
};

/**
 * Count the number of questions within a project
 *
 * @param {string} projectId
 */
export const counts = async (projectId: string, contextId: string | undefined) => {
  const questionsConnection = Adapter.get(RESOURCE.QUESTION);
  const searchFilters: any[] = [];
  if (projectId) {
    searchFilters.push({
      field: 'project_id',
      value: projectId,
    });
  }
  if (contextId !== undefined) {
    searchFilters.push({
      field: 'context_id',
      value: contextId,
    });
  }
  const count = await questionsConnection.count(searchFilters);
  return count;
};

/**
 * Remove specific question
 *
 * @param {string} questionId - the question id
 */
export const remove = async (questionId: string) => {
  Logger.info('Deleting question:' + questionId);
  const questionsConnection = Adapter.get(RESOURCE.QUESTION);
  const stats = await questionsConnection.remove([{ field: 'id', value: questionId }]);
  Logger.info(`Deleted question: ${questionId}`);
  return stats;
};
