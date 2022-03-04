const { v4: uuid } = require('uuid');
const Logger = rootRequire('/config/logger');
const es = rootRequire('adapters/es/adapter');

const Adapter = es.Adapter;
const RESOURCE = es.RESOURCE;

const MAX_INSIGHTS = 50;

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
  dataState,
  // eslint-disable-next-line camelcase
  annotation_state) => {
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
    modified_at: Date.now(),
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
    data_state: dataState,
    annotation_state: annotation_state
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
 * Returns a list of insights that match a filter
 */
const getAllInsights = async (filterParams, options) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  if (!options.size) {
    options.size = MAX_INSIGHTS;
  }
  const results = await insightsConnection.find(filterParams, options);
  return results;
};

/**
 * Returns an insight matching the id
 */
const getInsight = async (insightId, fieldAllowList) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const options = {};
  if (fieldAllowList && fieldAllowList.length > 0) {
    options.includes = fieldAllowList;
  }
  const result = await insightsConnection.findOne([{ field: 'id', value: insightId }], options);
  return result;
};

/**
 * Count the number of insights that math a filter
 */
const count = async (filterParams) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const count = await insightsConnection.count(filterParams);
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
  count,
  remove,
  insertInsight,
  updateInsight
};
