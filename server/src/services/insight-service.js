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
  modelId,
  url,
  targetView,
  preActions,
  postActions,
  isDefault,
  analyticalQuestion,
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
    model_id: modelId,
    url,
    target_view: targetView,
    pre_actions: preActions,
    post_actions: postActions,
    is_default: isDefault,
    analytical_question: analyticalQuestion,
    thumbnail,
    view_state: viewState,
    data_state: dataState
  }, keyFn);

  // Acknowledge success
  return { id: newId };
};

/**
 * Returns a list of insights
 */
const getAllInsights = async (projectId, modelId, targetView, visibility) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const searchFilters = [];
  if (projectId) {
    searchFilters.push({
      field: 'project_id',
      value: projectId
    });
  }
  if (modelId !== undefined) {
    searchFilters.push({
      field: 'model_id',
      value: modelId
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
const counts = async (projectId) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const count = await insightsConnection.count([{ field: 'project_id', value: projectId }]);
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
  remove
};
