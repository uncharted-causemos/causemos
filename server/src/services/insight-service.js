const moment = require('moment');
const uuid = require('uuid');
const Logger = rootRequire('/config/logger');
const es = rootRequire('adapters/es/adapter');

const Adapter = es.Adapter;
const RESOURCE = es.RESOURCE;

/**
 * Wrapper to create a new insight.
 *
 * @param {string} projectId - project id
 * @param {string} title - insight title
 * @param {string} description - insight description
 * @param {string} url - saved state as URL
 */
const createInsight = async (
  name,
  description,
  visibility,
  projectId,
  contextId,
  url,
  targetView,
  preActions,
  postActions,
  isDefault,
  // eslint-disable-next-line camelcase
  analytical_question,
  thumbnail,
  viewState,
  dataState) => {
  const newId = uuid();
  Logger.info('Creating insight entry: ' + newId);
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const keyFn = (doc) => {
    return doc.id;
  };
  await insightsConnection.insert({
    id: newId,
    name,
    description,
    modified_at: moment().valueOf(),
    visibility,
    project_id: projectId,
    context_id: contextId,
    url,
    target_view: targetView,
    pre_actions: preActions,
    post_actions: postActions,
    is_default: isDefault,
    analytical_question: analytical_question,
    thumbnail,
    view_state: viewState,
    data_state: dataState
  }, keyFn);

  // Acknowledge success
  return { id: newId };
};

/**
 * Insert an insight object as a whole
 */
const insertInsight = async(insight) => {
  const connection = Adapter.get(RESOURCE.INSIGHT);
  return await connection.insert(insight);
};

/**
 * Update an insight with the specified changes
 */
const updateInsight = async(id, insight) => {
  const connection = Adapter.get(RESOURCE.INSIGHT);
  const result = await connection.update({
    id: id,
    ...insight
  }, d => d.id);
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
};

/**
 * Returns a list of insights
 */
const getAllInsights = async (projectId, contextId, targetView, visibility) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const searchFilters = [];
  // FIXME: add support for analysisId field
  if (projectId) {
    searchFilters.push({
      field: 'project_id',
      value: projectId
    });
  }
  if (contextId !== undefined) {
    searchFilters.push({
      field: 'context_id',
      value: contextId
    });
  }
  if (targetView) {
    searchFilters.push({
      field: 'target_view',
      value: targetView
    });
  }
  if (visibility) {
    searchFilters.push({
      field: 'visibility',
      value: visibility
    });
  }
  const results = await insightsConnection.find(searchFilters, { size: 50 });
  return results;
};

/**
 * Returns an insight
 */
const getInsight = async (insightId) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const result = await insightsConnection.findOne([{ field: 'id', value: insightId }], {});
  return result;
};

/**
 * Count the number of insights within a project
 *
 * @param {string} projectId
 */
const counts = async (projectId, contextId, targetView, visibility) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const searchFilters = [];
  if (projectId) {
    searchFilters.push({
      field: 'project_id',
      value: projectId
    });
  }
  if (contextId !== undefined) {
    searchFilters.push({
      field: 'context_id',
      value: contextId
    });
  }
  if (targetView) {
    searchFilters.push({
      field: 'target_view',
      value: targetView
    });
  }
  if (visibility) {
    searchFilters.push({
      field: 'visibility',
      value: visibility
    });
  }
  const count = await insightsConnection.count(searchFilters);
  return count;
};

/**
 * Remove specific insight
 *
 * @param {string} insightId - the insight id
 */
const remove = async (insightId) => {
  Logger.info('Deleting insight:' + insightId);
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const stats = await insightsConnection.remove([{ field: 'id', value: insightId }]);
  Logger.info(`Deleted insight: ${insightId}`);
  return stats;
};


module.exports = {
  createInsight,
  getAllInsights,
  getInsight,
  counts,
  remove,
  insertInsight,
  updateInsight
};
