const { v4: uuid } = require('uuid');
const Logger = require('#@/config/logger.js');
const es = require('#@/adapters/es/adapter.js');

const Adapter = es.Adapter;
const RESOURCE = es.RESOURCE;

/**
 * Wrapper to create a new question.
 *
 * @param {string} projectId - project id
 * @param {string} title - question title
 * @param {string} description - question description
 * @param {string} url - saved state as URL
 */
const createQuestion = async (question, projectId, contextId, linkedInsights, viewState) => {
  const newId = uuid();
  Logger.info('Creating question entry: ' + newId);
  const questionsConnection = Adapter.get(RESOURCE.QUESTION);
  const keyFn = (doc) => {
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
const insertQuestion = async (question) => {
  const connection = Adapter.get(RESOURCE.QUESTION);
  return await connection.insert(question);
};

/**
 * Update an question with the specified changes
 */
const updateQuestion = async (id, question) => {
  const connection = Adapter.get(RESOURCE.QUESTION);
  const result = await connection.update(
    {
      id: id,
      ...question,
    },
    (d) => d.id
  );
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
};

/**
 * Returns a list of questions
 */
const getAllQuestions = async (projectId, contextId) => {
  const questionsConnection = Adapter.get(RESOURCE.QUESTION);
  const searchFilters = [];
  // FIXME: add support for analysisId field
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
const getQuestion = async (questionId) => {
  const questionsConnection = Adapter.get(RESOURCE.QUESTION);
  const result = await questionsConnection.findOne([{ field: 'id', value: questionId }], {});
  return result;
};

/**
 * Count the number of questions within a project
 *
 * @param {string} projectId
 */
const counts = async (projectId, contextId) => {
  const questionsConnection = Adapter.get(RESOURCE.QUESTION);
  const searchFilters = [];
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
const remove = async (questionId) => {
  Logger.info('Deleting question:' + questionId);
  const questionsConnection = Adapter.get(RESOURCE.QUESTION);
  const stats = await questionsConnection.remove([{ field: 'id', value: questionId }]);
  Logger.info(`Deleted question: ${questionId}`);
  return stats;
};

module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestion,
  counts,
  remove,
  insertQuestion,
  updateQuestion,
};
