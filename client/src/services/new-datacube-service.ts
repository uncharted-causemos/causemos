import API from '@/api/api';
import { Model, QualifierBreakdownResponse, QualifierCountsResponse, QualifierListsResponse } from '@/types/Datacube';
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
  const { data } = await API.get<ModelRun[]>('/maas/model-runs', {
    params: { modelId: dataId }
  });
  return data;
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

/**
 * Fetches the lists of regions for the specified model runs or indicator.
 * For multiple model runs, the regions are combined into one list per admin level.
 * @param dataId indicator or model ID
 * @param runIds the IDs of the model runs. If this is an indicator, should be ['indicator']
 * @param feature the output feature
 */
export const getRegionLists = async (
  dataId: string,
  runIds: string[],
  feature: string
) => {
  const { data } = await API.get('maas/output/region-lists', {
    params: {
      data_id: dataId,
      run_ids: runIds,
      feature
    }
  });
  return data;
};

/**
 * Fetches the number of values in each qualifier for a given model run or indicator.
 * Also returns the limits used then computing the data.
 * @param dataId indicator or model ID
 * @param runId the ID of the model run. If this is an indicator, should be 'indicator'
 * @param feature the output feature
 */
export const getQualifierCounts = async (
  dataId: string,
  runId: string,
  feature: string
) => {
  const { data } = await API.get('maas/output/qualifier-counts', {
    params: {
      data_id: dataId,
      run_id: runId,
      feature
    }
  });
  return data as QualifierCountsResponse;
};

/**
 * Fetches the lists of all qualifier values for the specified qualifiers in the model run or indicator.
 * @param dataId indicator or model ID
 * @param runId the ID of the model run. If this is an indicator, should be ['indicator']
 * @param feature the output feature
 * @param qualifiers the qualifier names
 */
export const getQualifierLists = async (
  dataId: string,
  runId: string,
  feature: string,
  qualifiers: string[]
) => {
  const { data } = await API.get('maas/output/qualifier-lists', {
    params: {
      data_id: dataId,
      run_id: runId,
      feature,
      qlf: qualifiers
    }
  });
  return data as QualifierListsResponse;
};

export const getQualifierTimeseries = async (
  dataId: string,
  runId: string,
  feature: string,
  temporalResolution: string,
  temporalAggregation: string,
  spatialAggregation: string,
  qualifierVariableId: string,
  qualifierOptions: string[],
  regionId?: string
) => {
  return await API.get('maas/output/qualifier-timeseries', {
    params: {
      data_id: dataId,
      run_id: runId,
      feature: feature,
      resolution: temporalResolution,
      temporal_agg: temporalAggregation,
      spatial_agg: spatialAggregation,
      region_id: regionId,
      qualifier: qualifierVariableId,
      q_opt: qualifierOptions
    }
  });
};

export const getQualifierBreakdown = async (
  dataId: string,
  runId: string,
  feature: string,
  qualifierVariableIds: string[],
  temporalResolution: string,
  temporalAggregation: string,
  spatialAggregation: string,
  timestamp: number
) => {
  const { data } = await API.get('maas/output/qualifier-data', {
    params: {
      data_id: dataId,
      run_id: runId,
      feature: feature,
      resolution: temporalResolution,
      temporal_agg: temporalAggregation,
      spatial_agg: spatialAggregation,
      timestamp,
      qlf: qualifierVariableIds
    }
  });
  return data as QualifierBreakdownResponse[];
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
  getSuggestions,
  createModelRun,
  addModelRunsTag,
  updateModelRun,
  removeModelRunsTag,
  renameModelRunsTag
};
