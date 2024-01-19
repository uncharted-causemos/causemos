const _ = require('lodash');
const { v4: uuid } = require('uuid');
const { Adapter, RESOURCE } = require('#@/adapters/es/adapter.js');

const find = async (simpleFilters, size, from, sort) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  if (_.isNil(size)) size = 20;
  if (_.isNil(sort)) sort = { modified_at: 'desc' };
  return connection.find(simpleFilters, { size, from, sort });
};

const createAnalysis = async (payload) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  const newId = uuid();
  const ts = new Date().getTime();

  const result = await connection.insert(
    {
      id: newId,
      title: payload.title,
      description: payload.description,
      project_id: payload.project_id,
      created_at: ts,
      modified_at: ts,
      state: payload.state,
    },
    (d) => d.id
  );

  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }

  return { id: newId };
};

const updateAnalysis = async (id, payload) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  const ts = new Date().getTime();

  const result = await connection.update(
    {
      id: id,
      modified_at: ts,
      ...payload,
    },
    (d) => d.id
  );
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
};

const getAnalysisItem = async (analysisId, analysisItemId) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  const analysis = await connection.findOne([{ field: 'id', value: analysisId }]);
  return analysis;
};

// Note: Use this function for updating individual analysis items instead of `updateAnalysis`.
// `updateAnalysis` replaces the entire `analysisItems` list, risking unexpected results in race conditions.
// While this function doesn't guarantee atomic updates, it reduces the chance of lost updates
// by fetching the latest document just before making the update.
const updateAnalysisItem = async (analysisId, analysisItemId, analysisItemPayload) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  const analysis = await connection.findOne([{ field: 'id', value: analysisId }]);
  const items = analysis.analysisItems || [];
  const newItems = items.map((item) =>
    item.id === analysisItemId ? { ...item, ...analysisItemPayload } : item
  );
  return await updateAnalysis(analysisId, { analysisItems: newItems });
};

const deleteAnalysis = async (id) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);

  const results = await connection.remove([{ field: 'id', value: id }]);
  if (!results.deleted) {
    throw new Error(`Unable to delete analysis: ${id}`);
  }
  return true;
};

module.exports = {
  find,
  createAnalysis,
  updateAnalysis,
  deleteAnalysis,
  getAnalysisItem,
  updateAnalysisItem,
};
