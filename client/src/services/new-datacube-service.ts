import API from '@/api/api';
import { Model } from '@/types/Datacube';
import { Filters } from '@/types/Filters';
import { ModelRun } from '@/types/ModelRun';
import fu from '@/utils/filters-util';

/**
 * Get datacubes
 * @param {Filters} filters
 */
export const getDatacubes = async (filters: Filters, options = {}) => {
  const { data } = await API.get('maas/new-datacubes', { params: { filters: filters, options: options } });
  return data;
};

/**
 * Get datacube facets
 * @param {string[]} facets
 * @param {Filters} filters
 */
export const getDatacubeFacets = async (facets: string[], filters: Filters) => {
  const { data } = await API.get(`maas/new-datacubes/facets?facets=${JSON.stringify(facets)}&filters=${JSON.stringify(filters)}`);
  return data;
};

/**
 * Get a datacube by id
 * @param {string} datacubeId
 */
export const getDatacubeById = async (datacubeId: string, feature?: string) => {
  const filters = fu.newFilters();
  fu.setClause(filters, 'id', [datacubeId], 'or', false);
  const cubes = await getDatacubes(filters);
  if (cubes && feature) {
    const activeCube = cubes.filter((c: { default_feature: string }) => {
      return c.default_feature === feature;
    })[0];
    return activeCube;
  }
  return cubes && cubes[0];
};

/**
 * Get the count of the datacubes that meets the filter criteria. By default filters is empty.
 * @param {Filters} filters Optional filters object
 * @returns {Promise<number>}
 */
export const getDatacubesCount = async (filters: Filters) => {
  const { data } = await API.get('maas/new-datacubes/count', { params: { filters: filters } });
  return data || 0;
};

/**
 * Get the count of model type datacubes
 */
export const getModelDatacubesCount = async () => {
  return await _getDatacubesCount('model');
};

/**
 * Get the count of indicator type datacubes
 */
export const getIndicatorDatacubesCount = async () => {
  return await _getDatacubesCount('indicator');
};

/**
 * Get the datacube count for the specified type
 * @param {string} datacubeType - datacube type
 */
const _getDatacubesCount = async (datacubeType: string) => {
  const typeField = 'type';
  const filters = fu.newFilters();
  fu.setClause(filters, typeField, [`${datacubeType}`], 'or', false);
  return await getDatacubesCount(filters);
};

/**
 * Update an existing model metadata
 * @param datacubeId datacube or model id
 * @param fields an object of all metadata fields and their new values
 * @returns success or error on failure
 */
export const updateDatacube = async (datacubeId: string, metadata: Model) => {
  const result = await API.put(`maas/new-datacubes/${datacubeId}`, metadata);
  return result.data;
};

export const getModelRunMetadata = async (dataId: string) => {
  const { data } = await API.get<ModelRun[]>('/maas/model-runs', {
    params: { modelId: dataId }
  });
  return data;
};

export default {
  updateDatacube,
  getDatacubes,
  getDatacubeById,
  getDatacubesCount,
  getDatacubeFacets,
  getModelDatacubesCount,
  getIndicatorDatacubesCount,
  getModelRunMetadata
};
