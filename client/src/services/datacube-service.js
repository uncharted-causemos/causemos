import API from '@/api/api';
import fu from '@/utils/filters-util';
/**
 * Import type definitions
 * @typedef {import('@/utils/filters-util').Filters} Filters
 */

/**
 * Get datacubes
 * @param {Filters} filters
 */
export const getDatacubes = async (filters) => {
  const { data } = await API.get(`maas/datacubes?filters=${JSON.stringify(filters)}`);
  return data;
};

/**
 * Get a datacube by id
 * @param {string} datacubeId
 */
export const getDatacubeById = async (datacubeId) => {
  const idField = 'id';
  const filters = fu.newFilters();
  fu.setClause(filters, idField, [`${datacubeId}`], 'or', false);
  fu.setClause(filters, 'type', ['model'], 'or', false);
  const cubes = await getDatacubes(filters);
  return cubes && cubes[0];
};

/**
 * Get the count of the datacubes that meets the filter criteria. By default filters is empty.
 * @param {Filters} filters Optional filters object
 * @returns {number}
 */
export const getDatacubesCount = async (filters) => {
  const filtersQuery = filters ? `?filters=${JSON.stringify(filters)}` : '';
  const { data } = await API.get(`maas/datacubes/count${filtersQuery}`);
  return data || 0;
};

/**
 * Get the count of model type datacubes
 * @returns {number}
 */
export const getModelDatacubesCount = async () => {
  return _getDatacubesCount('model');
};

/**
 * Get the count of indicator type datacubes
 * @returns {number}
 */
export const getIndicatorDatacubesCount = async () => {
  return _getDatacubesCount('indicator');
};

/**
 * Get the datacube count for the specified type
 * @param {string} modelType - datacube type
 * @returns {number}
 */
const _getDatacubesCount = async (modelType) => {
  const typeField = 'type';
  const filters = fu.newFilters();
  fu.setClause(filters, typeField, [`${modelType}`], 'or', false);
  return getDatacubesCount(filters);
};

/**
 * Get the model runs data for given model
 * @param {string|number} modelId Model Id
 */
export const getModelRuns = async (modelId) => {
  const { data } = await API.get(`maas/models/${modelId}/runs`);
  return data;
};

/**
 * Get the parameters metadata for the given model.
 * @param {string|number} modelId Model Id
 */
export const getModelParameters = async (modelId) => {
  const { data } = await API.get(`maas/models/${modelId}/parameters`);
  return data;
};

export default {
  getDatacubes,
  getDatacubeById,
  getDatacubesCount,
  getModelDatacubesCount,
  getIndicatorDatacubesCount,

  getModelRuns,
  getModelParameters
};
