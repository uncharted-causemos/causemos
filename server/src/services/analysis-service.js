const _ = require('lodash');
const { v4: uuid } = require('uuid');
const { getCache, setCache } = rootRequire('/cache/node-lru-cache');
const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');

const find = async (simpleFilters, size, from, sort) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  if (_.isNil(size)) size = 20;
  if (_.isNil(sort)) sort = { modified_at: 'desc' };
  return connection.find(simpleFilters, { size, from, sort });
};

const createAnalysis = async (payload) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  const newId = uuid();
  const ts = (new Date()).getTime();

  const result = await connection.insert({
    id: newId,
    title: payload.title,
    description: payload.description,
    project_id: payload.project_id,
    created_at: ts,
    modified_at: ts,
    state: payload.state
  }, d => d.id);

  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }

  // Update count cache
  const projectId = payload.project_id;
  const projectCache = getCache(projectId);
  projectCache.stat.data_analysis_count += 1;
  setCache(projectId, projectCache);

  return { id: newId };
};

const updateAnalysis = async (id, payload) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);
  const ts = (new Date()).getTime();

  const result = await connection.update({
    id: id,
    modified_at: ts,
    ...payload
  }, d => d.id);
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
};


const deleteAnalysis = async (id) => {
  const connection = Adapter.get(RESOURCE.ANALYSIS);

  // Update count cache
  const analysis = await connection.findOne([{ field: 'id', value: id }], {});
  const projectId = analysis.project_id;
  const projectCache = getCache(projectId);
  projectCache.stat.data_analysis_count -= 1;
  setCache(projectId, projectCache);

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
  deleteAnalysis
};
