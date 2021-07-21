import API from '@/api/api';
import { Model } from '@/types/Datacube';
import { Filters } from '@/types/Filters';
import { ModelRun } from '@/types/ModelRun';
import fu from '@/utils/filters-util';

/**
 * Get datacubes
 * @param {Filters} filters
 * @param {object} options - ES options
 */
export const getDatacubes = async (filters: Filters, options = {}) => {
  const { data } = await API.get('maas/new-datacubes', {
    params: {
      filters: filters,
      options: options
    }
  });
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
export const getDatacubeById = async (datacubeId: string) => {
  const filters = fu.newFilters();
  fu.setClause(filters, 'dataId', [datacubeId], 'or', false);
  const cubes = await getDatacubes(filters);
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

// DEPRECATED - NO LONGER WORK
// TODO: REMOVE

/**
 * @deprecated
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getModelRuns = async (modelId: any) => {
  return [];
};

/**
 * @deprecated
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getModelParameters = async (modelId: any) => {
  return [];
};

export default {
  updateDatacube,
  getDatacubes,
  getDatacubeById,
  getDatacubesCount,
  getDatacubeFacets,
  getModelDatacubesCount,
  getIndicatorDatacubesCount,
  getModelRunMetadata,

  getModelRuns,
  getModelParameters
};
