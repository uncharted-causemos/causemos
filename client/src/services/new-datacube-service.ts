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
  const { data } = await API.get('maas/datacubes', {
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
  const { data } = await API.get(
    `maas/datacubes/facets?facets=${JSON.stringify(
      facets
    )}&filters=${JSON.stringify(filters)}`
  );
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
 * @returns {Promise<number>}
 */
export const getDatacubesCount = async (filters: Filters) => {
  const { data } = await API.get('maas/datacubes/count', {
    params: { filters: filters }
  });
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
  const result = await API.put(`maas/datacubes/${datacubeId}`, metadata);
  return result.data;
};

export const getModelRunMetadata = async (dataId: string) => {
  const filter = JSON.stringify([{ field: 'model_id', value: dataId }]);
  const { data } = await API.get<ModelRun[]>('/maas/model-runs', {
    params: { filter }
  });
  return data;
};

export const getDefaultModelRunMetadata = async (dataId: string) => {
  const simpleFilter = [
    { field: 'model_id', value: dataId },
    { field: 'status', value: 'READY' },
    { field: 'is_default_run', value: true }
  ];
  const filter = JSON.stringify(simpleFilter);
  const { data } = await API.get<ModelRun[]>('/maas/model-runs', {
    params: { filter }
  });
  return data[0];
};

/**
 * Find suggested terms for the specified string, looking in the provided field
 *
 * @param {string} field - field which should be searched
 * @param {string} queryString - string to use to get suggestions
 */
export const getSuggestions = async (field: string, queryString: string) => {
  const { data } = await API.get('maas/datacubes/suggestions', {
    params: {
      field,
      q: queryString
    }
  });
  return data;
};


/**
 * Find datacubes by a query strings, returns a summaried datacube object
 */
export const getDatacubeSuggestions = async (queryString: string) => {
  const { data } = await API.get('maas/datacubes/datacube-suggestions', {
    params: {
      q: queryString
    }
  });
  return data;
};

export const updateModelRun = async (modelRun: ModelRun) => {
  const result = await API.put(`maas/model-runs/${modelRun.id}`, modelRun);
  return result.data;
};

export const createModelRun = (model_id: string, model_name: string, parameters: any[], is_default_run: boolean | undefined = undefined) => {
  // send the request to the server
  return API.post('maas/model-runs', {
    model_id,
    model_name,
    parameters,
    is_default_run
  });
};

export const addModelRunsTag = async (runIds: string[], tag: string) => {
  if (!runIds || runIds.length === 0 || !tag) {
    return null;
  }
  const filter = [{ field: 'id', value: runIds }];
  const result = await API.put('maas/model-run-tags', { filter, tag });
  return result.data;
};

export const removeModelRunsTag = async (runIds: string[], tag: string) => {
  if (!runIds || runIds.length === 0 || !tag) {
    return null;
  }
  const filter = JSON.stringify([{ field: 'id', value: runIds }]);
  const result = await API.delete('maas/model-run-tags', { params: { filter, tag } });
  return result.data;
};

export const renameModelRunsTag = async (runIds: string[], oldTag: string, newTag: string) => {
  if (!runIds || runIds.length === 0 || !oldTag || !newTag) {
    return null;
  }
  const filter = [{ field: 'id', value: runIds }];
  const result = await API.patch('maas/model-run-tags', { filter, oldTag, newTag });
  return result.data;
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
  getDefaultModelRunMetadata,
  getSuggestions,
  createModelRun,
  addModelRunsTag,
  updateModelRun,
  removeModelRunsTag,
  renameModelRunsTag,
  getDatacubeSuggestions
};
