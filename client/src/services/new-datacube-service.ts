import API from '@/api/api';
import { Filters } from '@/types/Filters';
import fu from '@/utils/filters-util';

/**
 * Get datacubes
 * @param {Filters} filters
 */
export const getDatacubes = async (filters: Filters) => {
  const { data } = await API.get('maas/new-datacubes', { params: { filters: filters } });
  return data;
};

/**
 * Get datacube facets
 * @param {string[]} facets
 * @param {Filters} filters
 */
export const getDatacubeFacets = async (facets: string[], filters: Filters) => {
  const { data } = await API.get('maas/new-datacubes/facets', {
    params: {
      filters: filters,
      facets: facets
    }
  });
  return data;
};

/**
 * Get a datacube by id
 * @param {string} datacubeId
 */
export const getDatacubeById = async (datacubeId: string) => {
  const filters = fu.newFilters();
  fu.setClause(filters, 'id', [datacubeId], 'or', false);
  const cubes = await getDatacubes(filters);
  return cubes && cubes[0];
};

/**
 * Get the count of the datacubes that meets the filter criteria. By default filters is empty.
 * @param {Filters} filters Optional filters object
 * @returns {number}
 */
export const getDatacubesCount = async (filters: Filters) => {
  const { data } = await API.get('maas/new-datacubes/count', { params: { filters: filters } });
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
 * @param {string} datacubeType - datacube type
 * @returns {number}
 */
const _getDatacubesCount = async (datacubeType: string) => {
  const typeField = 'type';
  const filters = fu.newFilters();
  fu.setClause(filters, typeField, [`${datacubeType}`], 'or', false);
  return getDatacubesCount(filters);
};

export default {
  getDatacubes,
  getDatacubeById,
  getDatacubesCount,
  getDatacubeFacets,
  getModelDatacubesCount,
  getIndicatorDatacubesCount
};
