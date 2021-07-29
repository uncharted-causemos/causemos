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
const getAllInsights = async (filterParams) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const searchFilters = getFilterFields(filterParams);
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
const counts = async (filterParams) => {
  const insightsConnection = Adapter.get(RESOURCE.INSIGHT);
  const searchFilters = getFilterFields(filterParams);
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

const getFilterFields = (filterParams) => {
  // NOTE: supported filter fields are listed also in the client service; InsightFilterFields
  const supportedSearchFields = [
    'project_id',
    'context_id',
    'target_view',
    'visibility',
    'analysis_id'
  ];
  const searchFilters = [];
  supportedSearchFields.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(filterParams, key)) {
      searchFilters.push({
        field: key,
        value: filterParams[key]
      });
    }
  });
  return searchFilters;
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
