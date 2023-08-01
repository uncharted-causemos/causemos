import _ from 'lodash';
import API from '@/api/api';
import { DataConfig, Datacube, Model } from '@/types/Datacube';
import { Clause, Filters } from '@/types/Filters';
import { ModelRun } from '@/types/ModelRun';
import { getTimeseries } from '@/services/outputdata-service';
import fu from '@/utils/filters-util';
import { getImageMime } from '@/utils/datacube-util';
import { FlowLogs, Facets } from '@/types/Common';
import { CachedDatacubeMetadata } from '@/types/Analysis';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';

/**
 * The parameters required to fetch a timeseries for a datacube and generate the sparkline data.
 */
export interface SparklineParams {
  id: string;
  dataId: string;
  runId: string;
  feature: string;
  resolution: string;
  temporalAgg: string;
  spatialAgg: string;
  rawResolution: string;
  finalRawTimestamp: number;
}

// TEMPORARY FIX MARCH 2023: some metadata coming from Jataware has flipped time period values.
//  This code can be removed once the metadata is corrected on their side.
const fixIncorrectData = (datacube: Datacube) => {
  // fix period
  if (
    !_.isNil(datacube.period?.gte) &&
    !_.isNil(datacube.period?.lte) &&
    datacube.period.gte > datacube.period.lte
  ) {
    datacube.period = {
      lte: datacube.period.gte,
      gte: datacube.period.lte,
    };
  }
  return datacube;
};
/**
 * Get datacubes
 * @param {Filters} filters
 * @param {object} options - ES options
 */
export const getDatacubes = async (filters: Filters, options = {}): Promise<Datacube[]> => {
  const { data } = await API.get('maas/datacubes', {
    params: {
      filters: filters,
      options: options,
    },
  });
  return data.map(fixIncorrectData);
};

/**
 * Get indicator or model by `dataId`, as opposed to `id`.
 * `dataId` is an identifier provided at registration time by Jataware.
 * `id` is an ElasticSearch document ID generated during registration.
 * NOTE: If there are multiple documents with the same dataId (e.g. one Dojo Dataset with multiple
 *  features(a.k.a. output variables)), this function will arbitrarily return one of them.
 */
export const getDatacubeByDataId = async (dataId: string): Promise<Datacube | null> => {
  const result = await getDatacubes(
    { clauses: [{ field: 'dataId', operand: 'or', isNot: false, values: [dataId] }] },
    { from: 0, size: 1 }
  );
  return result[0] ?? null;
};

/**
 * Get a specific datacube within a dataset (e.g. a specific feature/output variable).
 * For indicators: Each feature has its own "datacube" ES document.
 * For models: There is one document for each model, with 1 to many entries in `outputs`.
 * This function will return the correct document for each type, but if you know you're searching
 *  for a model you can use getDatacubeByDataId since outputVariable won't change the result.
 * @param dataId ID shared by all datacubes that come from the same Dojo Dataset
 * @param outputVariable Unique name to tell those datacubes apart (a.k.a feature)
 */
export const getDatacubeByDataIdAndOutputVariable = async (
  dataId: string,
  outputVariable: string
): Promise<Datacube | null> => {
  const result = await getDatacubes(
    {
      clauses: [
        { field: 'dataId', operand: 'or', isNot: false, values: [dataId] },
        { field: 'outputName', operand: 'or', isNot: false, values: [outputVariable] },
      ],
    },
    { from: 0, size: 1 }
  );
  return result[0] ?? null;
};

export const getDatacubeByDataIdAndOutputVariableAndCountry = async (
  dataId: string,
  outputVariable: string,
  countries: string[]
): Promise<Datacube | null> => {
  const clauses: Clause[] = [
    { field: 'dataId', operand: 'or', isNot: false, values: [dataId] },
    { field: 'outputName', operand: 'or', isNot: false, values: [outputVariable] },
  ];
  countries.forEach((country) =>
    clauses.push({ field: 'geography.country.raw', operand: 'or', isNot: false, values: [country] })
  );

  const result = await getDatacubes(
    {
      clauses: clauses,
    },
    { from: 0, size: 1 }
  );
  return result[0] ?? null;
};

/**
 * Get datacube facets
 * @param {string[]} facets
 * @param {Filters} filters
 */
export const getDatacubeFacets = async (facets: string[], filters: Filters): Promise<Facets> => {
  const { data } = await API.get('maas/datacubes/facets', {
    params: {
      facets: JSON.stringify(facets),
      filters: filters,
    },
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
  return cubes && cubes.length > 0 && cubes[0];
};

/**
 * Get  datacubes by ids
 * @param {string[]} datacubeIds
 */
export const getDatacubesByIds = async (datacubeIds: string[]) => {
  const filters = fu.newFilters();
  fu.setClause(filters, 'id', datacubeIds, 'or', false);
  const cubes = await getDatacubes(filters);
  return cubes;
};

/**
 * Get the count of the datacubes that meets the filter criteria. By default filters is empty.
 * @param {Filters} filters Optional filters object
 * @returns {Promise<number>}
 */
export const getDatacubesCount = async (filters: Filters) => {
  const { data } = await API.get('maas/datacubes/count', {
    params: { filters: filters },
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
 * @param metadata an object of all metadata fields and their new values
 * @returns success or error on failure
 */
export const updateDatacube = async (datacubeId: string, metadata: Partial<Model>) => {
  const result = await API.put(`maas/datacubes/${datacubeId}`, metadata);
  return result.data;
};

/**
 * Update multiple indicators. Each delta object must contain the document id that should be updated.
 * @param metaDeltas an array of metadata delta objects and the document id
 * @returns success or error on failure
 */
export const updateIndicatorsBulk = async (metaDeltas: { id: string; [key: string]: any }[]) => {
  const result = await API.post('maas/datacubes/bulk-update-indicator', { deltas: metaDeltas });
  return result.data;
};

/**
 * Generate the data required to show a sparkline. Accepts multiple datacubes.
 * @param sparklineParamsList an array of objects with the parameters required to fetch a timeseries
 * @returns success or error on failure
 */
export const generateSparklines = async (sparklineParamsList: SparklineParams[]) => {
  const result = await API.post('maas/datacubes/add-sparklines', {
    datacubes: sparklineParamsList,
  });
  return result.data;
};

/**
 * Get the fields that represent a dataset from the first indicator with the provided data_id
 * @param {string} dataId
 */
export const getDataset = async (dataId: string) => {
  const filters = fu.newFilters();
  fu.setClause(filters, 'type', ['indicator'], 'or', false);
  fu.setClause(filters, 'dataId', [dataId], 'or', false);
  const options = {
    excludes: [
      'outputs',
      'qualifier_outputs',
      'ontology_matches',
      'geography.admin1',
      'geography.admin2',
      'geography.admin3',
    ],
    size: 1,
  };
  const cubes = await getDatacubes(filters, options);
  return cubes && cubes.length > 0 && cubes[0];
};

export const getModelRunMetadata = async (dataId: string) => {
  const filter = JSON.stringify([{ field: 'model_id', value: dataId }]);
  const { data } = await API.get<ModelRun[]>('/maas/model-runs', {
    params: { filter },
  });
  return data;
};

export const getDefaultModelRunMetadata = async (dataId: string) => {
  const simpleFilter = [
    { field: 'model_id', value: dataId },
    { field: 'status', value: 'READY' },
    { field: 'is_default_run', value: true },
  ];
  const filter = JSON.stringify(simpleFilter);
  const { data } = await API.get<ModelRun[]>('/maas/model-runs', {
    params: { filter },
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
      q: queryString,
    },
  });
  return data;
};

/**
 * Find datacubes by a query strings, returns a summaried datacube object
 */
export const getDatacubeSuggestions = async (queryString: string) => {
  const { data } = await API.get('maas/datacubes/datacube-suggestions', {
    params: {
      q: queryString,
    },
  });
  return data;
};

export const updateModelRun = async (modelRun: Partial<ModelRun>) => {
  const result = await API.put(`maas/model-runs/${modelRun.id}`, modelRun);
  return result.data;
};

export const createModelRun = (
  model_id: string,
  model_name: string,
  parameters: any[],
  is_default_run: boolean | undefined = undefined
) => {
  // send the request to the server
  return API.post('maas/model-runs', {
    model_id,
    model_name,
    parameters,
    is_default_run,
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

export const fetchImageAsBase64 = async (url: string): Promise<string | undefined> => {
  try {
    const { data } = await API.get('url-to-b64', { params: { url } });
    const mime = getImageMime(url);
    return `data:${mime};base64,${data}`;
  } catch (e) {
    console.log(`Unable to get base64 for ${url}`);
    return undefined;
  }
};

export const fetchFlowLogs = async (flowId: string): Promise<FlowLogs | undefined> => {
  try {
    const { data } = await API.get('prefect-flow-logs', { params: { flowId } });
    return _parseFlowLogs(data);
  } catch (e) {
    console.log(`Unable to get flow logs for ${flowId}`);
    return undefined;
  }
};

const _parseFlowLogs = (data: any): FlowLogs | undefined => {
  if (!data.state || !data.start_time || !data.logs || !data.agent) {
    return undefined;
  }
  return {
    state: data.state as string,
    start_time: new Date(data.start_time),
    end_time: data.end_time ? new Date(data.end_time) : undefined,
    logs: data.logs.map((log: any) => ({
      timestamp: new Date(log.timestamp),
      message: log.message,
    })),
    agent: data.agent,
  } as FlowLogs;
};

export const getDefaultFeature = (datacube: Datacube) => {
  return datacube.outputs.find((output) => output.name === datacube.default_feature);
};

// Extract some useful metadata to summarize a datacube.
// Used when adding a datacube to an analysis from the data explorer so that the
//  full metadata doesn't need to be fetched before the datacube can be
//  displayed in the side panel list.
export const getDatacubeMetadataToCache = (datacube: Datacube): CachedDatacubeMetadata => {
  const featureName = getDefaultFeature(datacube)?.display_name ?? datacube.default_feature;
  return {
    featureName,
    datacubeName: datacube.name,
    source: datacube.maintainer.organization,
  };
};

export const getDefaultDataConfig = async (dataId: string, outputVariable: string) => {
  const metadata = await getDatacubeByDataId(dataId);
  const config: DataConfig = {
    datasetId: dataId,
    runId: 'indicator',
    outputVariable,
    selectedTimestamp: 0,
    spatialAggregation: metadata?.default_view?.spatialAggregation || AggregationOption.Mean,
    temporalAggregation: metadata?.default_view?.temporalAggregation || AggregationOption.Mean,
    temporalResolution:
      metadata?.default_view?.temporalResolution || TemporalResolutionOption.Month,
  };
  // Fetch timeseries to find the true last point we have data for. `period.lte` is unreliable.
  const data = await getTimeseries({
    modelId: config.datasetId,
    outputVariable: config.outputVariable,
    runId: config.runId,
    spatialAggregation: config.spatialAggregation,
    temporalAggregation: config.temporalAggregation,
    temporalResolution: config.temporalResolution,
  });
  config.selectedTimestamp = data[data.length - 1].timestamp;
  return config;
};

export const getSpatialCoverageOverlap = async (dataIds: string[]) => {
  const { data } = await API.get('maas/datacubes/coverage', {
    params: {
      data_ids: dataIds,
    },
  });
  return data as string[];
};

export default {
  updateDatacube,
  getDatacubes,
  getDatacubeByDataId,
  getDatacubeByDataIdAndOutputVariable,
  getDatacubeByDataIdAndOutputVariableAndCountry,
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
  getDatacubeSuggestions,
  fetchFlowLogs,
};
