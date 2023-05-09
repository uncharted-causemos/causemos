import _ from 'lodash';
import API from '@/api/api';
import { DatacubeGeography } from '@/types/Common';
import {
  AdminLevel,
  SpatialAggregationLevel,
  AggregationOption,
  ReferenceSeriesOption,
  TemporalAggregationLevel,
  TemporalResolution,
} from '@/types/Enums';
import {
  OutputSpec,
  OutputSpecWithId,
  RegionalAggregations,
  RegionAgg,
  RegionalAggregation,
  OutputStatWithZoom,
  OutputStatsResult,
  RawOutputDataPoint,
  QualifierBreakdownResponse,
  QualifierCountsResponse,
  QualifierListsResponse,
  OutputSpecWithRegionId,
  BaseSpec,
  BulkRegionalAggregationData,
} from '@/types/Outputdata';
import { isSplitByQualifierActive } from '@/utils/qualifier-util';
import { FIFOCache } from '@/utils/cache-util';
import { filterRawDataByRegionIds, computeTimeseriesFromRawData } from '@/utils/outputdata-util';
import { getLevelFromRegionId, adminLevelToString } from '@/utils/admin-level-util';
import { normalize } from '@/utils/value-util';
import { TimeseriesPoint } from '@/types/Timeseries';

const RAW_DATA_REQUEST_CACHE_SIZE = 20;
const rawDataRequestCache = new FIFOCache<Promise<RawOutputDataPoint[]>>(
  RAW_DATA_REQUEST_CACHE_SIZE
);

/*
  getRaw[something] functions:
  - these all leverage data ultimately sourced from the raw-data api endpoint
  - only use getRaw naming pattern for functions that use data from that endpoint
*/

export const getRawOutputData = async (param: {
  dataId: string;
  runId: string;
  outputVariable: string;
}): Promise<RawOutputDataPoint[]> => {
  // Fetching raw data is expensive and this function can be called by multiple functions in multiple places
  // simultaneously with same parameter set, cache the request and retrieve the result for the same request
  // from the cache to avoid overheads.
  const cacheKey = [param.dataId, param.runId, param.outputVariable].join(':');

  let requestPromise = rawDataRequestCache.get(cacheKey);

  if (!requestPromise) {
    requestPromise = API.get('/maas/output/raw-data', {
      params: {
        data_id: param.dataId,
        run_id: param.runId,
        feature: param.outputVariable,
      },
    })
      .then((res) => {
        // Remove invalid data points and make sure all values are number
        return res.data.filter((d: RawOutputDataPoint) => _.isNumber(d.value));
      })
      .catch(() => {
        // if there was an error in the request, remove itself from the cache.
        rawDataRequestCache.remove(cacheKey);
        return [];
      });
    // Add the request to the cache
    rawDataRequestCache.set(cacheKey, requestPromise);
  }

  const data = await requestPromise;
  return data;
};

/**
 * WARNING: Raw data is the unprocessed data coming directly from DOJO, and it is often very large.
 * RAW DATA IS UNRELIABLE because we save a copy of the raw data only if the total # of dataset
 * rows is less than 10000.
 * https://gitlab.uncharted.software/WM/slow-tortoise/-/blob/master/flows/data_pipeline.py#L1292
 * https://gitlab.uncharted.software/WM/slow-tortoise/-/blob/master/flows/common.py#L313
 * (May 2023)
 * Use getTimeseries() below wherever possible to avoid 404 errors when trying to fetch raw data.
 */
export const getRawTimeseriesData = async (param: {
  dataId: string;
  runId: string;
  outputVariable: string;
  spatialAgg: string;
  regionId: string;
}): Promise<TimeseriesPoint[]> => {
  const rawData = await getRawOutputData(param);
  const filteredData = param.regionId
    ? filterRawDataByRegionIds(rawData, [param.regionId])
    : rawData;
  const result = computeTimeseriesFromRawData(filteredData, param.spatialAgg as AggregationOption);
  return result;
};

export const getRawTimeseriesDataBulk = async (
  param: {
    dataId: string;
    runId: string;
    outputVariable: string;
    spatialAgg: string;
  },
  regionIds: string[]
): Promise<{ region_id: string; timeseries: TimeseriesPoint[] }[]> => {
  const promises = regionIds.map((regionId) => getRawTimeseriesData({ regionId, ...param }));
  const data = await Promise.all(promises);
  return data.map((series, index) => ({ region_id: regionIds[index], timeseries: series }));
};

export const getRawOutputDataByTimestamp = async (param: {
  dataId: string;
  runId: string;
  outputVariable: string;
  timestamp: number | undefined;
}): Promise<RawOutputDataPoint[]> => {
  const rawData = await getRawOutputData(param);
  return rawData.filter((d) => d.timestamp === param.timestamp);
};

export const getRawQualifierTimeseries = async (param: {
  dataId: string;
  runId: string;
  outputVariable: string;
  aggregation: string;
  qualifierVariableId: string;
  qualifierOptions: string[];
  regionId?: string;
}) => {
  if (param.qualifierOptions.length === 0) {
    return [];
  }
  const rawData = await getRawOutputData(param);
  const filteredData = param.regionId
    ? filterRawDataByRegionIds(rawData, [param.regionId])
    : rawData;

  // Init an object to store raw data points grouped by each qualifier option provided by param
  const dataByOptions: { [opt: string]: RawOutputDataPoint[] } = {};
  for (const opt of param.qualifierOptions) {
    dataByOptions[opt] = [];
  }

  for (const d of filteredData) {
    // Filter by qualifier variable Id and bucket by qualifier option/value
    const qualOption = d[param.qualifierVariableId];
    if (qualOption && dataByOptions[qualOption]) {
      dataByOptions[qualOption].push(d);
    }
  }

  const result = Object.keys(dataByOptions).map((option) => {
    const timeseries = computeTimeseriesFromRawData(
      dataByOptions[option],
      param.aggregation as AggregationOption
    );
    return { name: option, timeseries };
  });

  return result;
};

export const getTimeseries = async (spec: OutputSpecWithRegionId): Promise<any> => {
  try {
    const result = await API.get('maas/output/timeseries', {
      params: {
        data_id: spec.modelId,
        run_id: spec.runId,
        feature: spec.outputVariable,
        resolution: spec.temporalResolution,
        temporal_agg: spec.temporalAggregation,
        spatial_agg: spec.spatialAggregation,
        transform: spec.transform,
        region_id: spec.regionId,
      },
    });
    // FIXME: return result.data instead of result
    return result;
  } catch (e) {
    return [];
  }
};

// TODO: once we integrate with jataware's normalized data path, replace this function to fetch normalized data from backend
export const getTimeseriesNormalized = async (
  spec: OutputSpecWithRegionId
): Promise<TimeseriesPoint[]> => {
  const result = ((await getTimeseries(spec)).data || []) as TimeseriesPoint[];
  const values = result.map((d) => d.value);
  const min = _.min(values) ?? 0;
  const max = _.max(values) ?? 0;
  return result.map((d) => {
    return { ...d, value: normalize(d.value, min, max) };
  });
};

export const getBulkTimeseries = async (spec: OutputSpec, regionIds: string[]): Promise<any> => {
  try {
    const result = await API.post(
      'maas/output/bulk-timeseries/regions',
      {
        region_ids: regionIds,
      },
      {
        params: {
          data_id: spec.modelId,
          run_id: spec.runId,
          feature: spec.outputVariable,
          resolution: spec.temporalResolution,
          temporal_agg: spec.temporalAggregation,
          spatial_agg: spec.spatialAggregation,
          transform: spec.transform,
        },
      }
    );
    return result;
  } catch (e) {
    return [];
  }
};

/**
 * Get the sparkline data for the given output data spec. If rawRes and rawLatestTimestamp are provided,
 * the last point value of the sparkline data maybe extrapolated or omitted accordingly based on the temporal coverage of the last aggregated point value.
 *
 * @param spec Output data spec
 * @param rawRes Temporal resolution of the corresponding raw data
 * @param rawLatestTimestamp Timestamp of the most recent record from the raw data
 */
export const getSparkline = async (
  spec: OutputSpec,
  rawRes?: TemporalResolution,
  rawLatestTimestamp?: number
): Promise<number[]> => {
  const params: any = {
    data_id: spec.modelId,
    run_id: spec.runId,
    feature: spec.outputVariable,
    resolution: spec.temporalResolution,
    temporal_agg: spec.temporalAggregation,
    spatial_agg: spec.spatialAggregation,
  };
  if (rawRes && rawLatestTimestamp) {
    params.raw_res = rawRes;
    params.raw_latest_ts = rawLatestTimestamp;
  }
  try {
    const { data } = await API.get('maas/output/sparkline', { params });
    return data || [];
  } catch (e) {
    return [];
  }
};

export const getRawQualifierBreakdown = async (
  dataId: string,
  runId: string,
  outputVariable: string,
  qualifierVariableIds: string[],
  aggregation: string,
  timestamp: number
): Promise<QualifierBreakdownResponse[]> => {
  const rawDataByTs = await getRawOutputDataByTimestamp({
    dataId,
    runId,
    outputVariable,
    timestamp,
  });
  interface qualifierAgg {
    [qualVal: string]: { count: number; sum: number };
  }
  interface qualifierAggs {
    [qualifierVarId: string]: qualifierAgg;
  }
  const aggs: qualifierAggs = {};
  // Init aggs object
  for (const varId of qualifierVariableIds) {
    aggs[varId] = {};
  }
  // Compute aggregation by qualifier value for each qualifier variable Id
  for (const dataPoint of rawDataByTs) {
    for (const varId of qualifierVariableIds) {
      const qualVal = dataPoint[varId];
      if (!aggs[varId][qualVal]) aggs[varId][qualVal] = { count: 0, sum: 0 };
      aggs[varId][qualVal].count += 1;
      aggs[varId][qualVal].sum += dataPoint.value;
    }
  }
  // For each qualifier variable Id, compute QualifierBreakdownResponse
  const result = qualifierVariableIds.map((varId) => {
    const options = Object.keys(aggs[varId]).map((qualVal) => {
      const count = aggs[varId][qualVal].count;
      const sum = aggs[varId][qualVal].sum;
      const value = aggregation === AggregationOption.Sum ? sum : sum / count;
      return { name: qualVal, value };
    });
    return { name: varId, options } as QualifierBreakdownResponse;
  });
  return result;
};

/**
 * Fetches the number of values in each qualifier for a given model run or indicator.
 * Also returns the limits used then computing the data.
 * @param dataId indicator or model ID
 * @param runId the ID of the model run. If this is an indicator, should be 'indicator'
 * @param feature the output feature
 */
export const getQualifierCounts = async (dataId: string, runId: string, feature: string) => {
  const { data } = await API.get('maas/output/qualifier-counts', {
    params: {
      data_id: dataId,
      run_id: runId,
      feature,
    },
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
      qlf: qualifiers,
    },
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
  transform?: string,
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
      transform: transform,
      qualifier: qualifierVariableId,
      q_opt: qualifierOptions,
    },
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
  timestamp: number,
  regionId: string
): Promise<QualifierBreakdownResponse[]> => {
  if (regionId.length > 0) {
    const [global, regional] = await Promise.all([
      getGlobalQualifierBreakdown(
        dataId,
        runId,
        feature,
        qualifierVariableIds,
        temporalResolution,
        temporalAggregation,
        spatialAggregation,
        timestamp
      ),
      getQualifierBreakdownByRegionId(
        dataId,
        runId,
        feature,
        qualifierVariableIds,
        temporalResolution,
        temporalAggregation,
        spatialAggregation,
        timestamp,
        regionId
      ),
    ]);
    // Remove all values from global qualifier, use only qualifier option name as placeholder
    for (const qual of global) {
      for (const opt of qual.options) {
        opt.value = undefined;
      }
    }
    return _.merge(global, regional);
  }
  return await getGlobalQualifierBreakdown(
    dataId,
    runId,
    feature,
    qualifierVariableIds,
    temporalResolution,
    temporalAggregation,
    spatialAggregation,
    timestamp
  );
};

export const getGlobalQualifierBreakdown = async (
  dataId: string,
  runId: string,
  feature: string,
  qualifierVariableIds: string[],
  temporalResolution: string,
  temporalAggregation: string,
  spatialAggregation: string,
  timestamp: number
): Promise<QualifierBreakdownResponse[]> => {
  const { data } = await API.get('maas/output/qualifier-data', {
    params: {
      data_id: dataId,
      run_id: runId,
      feature: feature,
      resolution: temporalResolution,
      temporal_agg: temporalAggregation,
      spatial_agg: spatialAggregation,
      timestamp,
      qlf: qualifierVariableIds,
    },
  });
  return data as QualifierBreakdownResponse[];
};

export const getQualifierBreakdownByRegionId = async (
  dataId: string,
  runId: string,
  feature: string,
  qualifierVariableIds: string[],
  temporalResolution: string,
  temporalAggregation: string,
  spatialAggregation: string,
  timestamp: number,
  regionId: string
): Promise<QualifierBreakdownResponse[]> => {
  const outputSpec: OutputSpec = {
    modelId: dataId,
    runId,
    outputVariable: feature,
    temporalResolution,
    temporalAggregation,
    spatialAggregation,
    timestamp,
    isDefaultRun: false,
  };
  const adminLevel = adminLevelToString(getLevelFromRegionId(regionId));
  const promises = qualifierVariableIds.map((varId) =>
    getRegionAggregationWithQualifiers(outputSpec, varId)
  );
  const regionalData = await Promise.all(promises);
  const result = regionalData
    .map((data, index) => {
      // Filter by region Id
      const regionAgg = data[adminLevel]?.filter((regionAgg) => regionAgg.id === regionId)[0];
      if (!regionAgg) return undefined;
      // Get qualifier options which is an array of object that represent qualifier option name and value pair
      const options = Object.entries((regionAgg as RegionAgg).values).map(([name, value]) => {
        return { name, value: value as number };
      });
      return { name: qualifierVariableIds[index], options };
    })
    .filter((d) => !!d);
  return result as QualifierBreakdownResponse[];
};

/**
 * Fetches the lists of regions for the specified model runs or indicator.
 * For multiple model runs, the regions are combined into one list per admin level.
 * @param dataId indicator or model ID
 * @param runIds the IDs of the model runs. If this is an indicator, should be ['indicator']
 * @param feature the output feature
 */
export const getRegionLists = async (dataId: string, runIds: string[], feature: string) => {
  const { data } = await API.get('maas/output/region-lists', {
    params: {
      data_id: dataId,
      run_ids: runIds,
      feature,
    },
  });
  return data;
};

export const getRegionAggregation = async (spec: OutputSpec): Promise<RegionalAggregation> => {
  // TODO: Handle http error properly in the backend and respond with correct error code if necessary.
  //       Meanwhile just ignore the error.
  try {
    const { data } = await API.get('/maas/output/regional-data', {
      params: {
        data_id: spec.modelId,
        run_id: spec.runId,
        feature: spec.outputVariable,
        resolution: spec.temporalResolution,
        temporal_agg: spec.temporalAggregation,
        spatial_agg: spec.spatialAggregation,
        timestamp: spec.timestamp,
        transform: spec.transform,
      },
    });
    return data;
  } catch (e) {
    return { country: [], admin1: [], admin2: [], admin3: [] };
  }
};

// TODO: temporary!
// We probably want to
//  - pre-normalize the data on the backend.
//  - normalize it with respect to the min and max of the dataset across timestamps
//  - Keep original value as well, instead of overriding it with the normalized version
export const getRegionAggregationNormalized = async (
  spec: OutputSpec,
  isInverted: boolean
): Promise<RegionalAggregation> => {
  const result = await getRegionAggregation(spec);
  if (result.country === undefined || result.country.length === 0) {
    return result;
  }
  const countries = result.country;
  const values = countries.map(({ value }) => value);
  const min = _.min(values) ?? 0;
  const max = _.max(values) ?? 0;
  result.country = countries.map((country) => {
    const normalizedValue = normalize(country.value, min, max);
    // If this dataset is inverted, higher original values should map closer to 0 and lower
    //  original values should map closer to 1.
    const countryValue = isInverted ? 1 - normalizedValue : normalizedValue;
    return {
      ...country,
      value: countryValue,
    };
  });
  return result;
};

export const getRegionAggregationWithQualifiers = async (
  spec: OutputSpec,
  qualifier: string
): Promise<RegionalAggregations> => {
  // TODO: Handle http error properly in the backend and respond with correct error code if necessary.
  //       Meanwhile just ignore the error.
  try {
    const { data } = await API.get('/maas/output/qualifier-regional', {
      params: {
        data_id: spec.modelId,
        run_id: spec.runId,
        feature: spec.outputVariable,
        resolution: spec.temporalResolution,
        temporal_agg: spec.temporalAggregation,
        spatial_agg: spec.spatialAggregation,
        timestamp: spec.timestamp,
        qualifier,
        transform: spec.transform,
      },
    });
    return data;
  } catch (e) {
    return { country: [], admin1: [], admin2: [], admin3: [] };
  }
};

export const getRegionAggregations = async (
  baseSpecs: OutputSpecWithId[],
  allRegions: DatacubeGeography,
  breakdownOption: string,
  referenceSeries?: string[],
  allTimestamps?: string[]
): Promise<RegionalAggregations> => {
  // Fetch and restructure the result
  let results;
  const specs = baseSpecs; // we generate additional specs on the fly for yearly reference series;

  if (isSplitByQualifierActive(breakdownOption)) {
    results = await Promise.all(
      specs.map((spec) => getRegionAggregationWithQualifiers(spec, breakdownOption))
    );
    // reduce duplicate calls without branching the more complex result processing logic.
  } else if (breakdownOption === SpatialAggregationLevel.Region) {
    const ret = await getRegionAggregation(specs[0]);
    results = new Array(specs.length).fill(ret) as RegionalAggregation[];
  } else if (breakdownOption === TemporalAggregationLevel.Year) {
    const selectedTimestamps = specs
      .map((s) => s.timestamp?.toString())
      .filter((s) => s !== undefined) as string[];

    // get bulk results then parse them into a format usable for the formatting section afterwards
    const bulkResults = await getBulkRegionalData(
      specs[0],
      selectedTimestamps,
      allTimestamps ?? [],
      referenceSeries
    );
    if (bulkResults.regional_data) {
      results = bulkResults?.regional_data.map((rd) => rd.data);
    } else {
      results = <RegionalAggregation[]>[];
    }
    if (bulkResults.all_agg && allTimestamps && allTimestamps.length > 0) {
      results.push(bulkResults.all_agg);
      const newSpec = <OutputSpecWithId>{
        id: ReferenceSeriesOption.AllYears as string,
      };
      specs.push(newSpec);
    }
    if (bulkResults.select_agg) {
      results.push(bulkResults.select_agg);
      const newSpec = <OutputSpecWithId>{
        id: ReferenceSeriesOption.SelectYears as string,
      };
      specs.push(newSpec);
    }
  } else {
    results = await Promise.all(specs.map(getRegionAggregation));
  }

  // FIXME: we have to do a bunch of Typescript shenanigans because in some
  //  parts of the app we go up to admin level 6, and in others just to admin
  //  level 3.
  const dict = {
    country: {},
    admin1: {},
    admin2: {},
    admin3: {},
  } as {
    [key in AdminLevel]: { [key: string]: RegionAgg };
  };
  // FIXME: cast to make compatible with objects indexed by AdminLevel
  const _allRegions = allRegions as { [key in AdminLevel]: string[] };
  // Initialize dict with an entry for each region in the entire hierarchy,
  //  regardless of whether it exists in the fetched results
  Object.values(AdminLevel).forEach((adminLevel) => {
    const selectedDictEntry = dict[adminLevel];
    if (_allRegions[adminLevel] !== undefined) {
      _allRegions[adminLevel].forEach((regionId) => {
        // Sanity check
        if (selectedDictEntry[regionId] !== undefined) {
          console.error(`Hierarchy data contains duplicate entry for "${regionId}"`);
          return;
        }
        selectedDictEntry[regionId] = { id: regionId, values: {} };
      });
    }
  });
  // Insert results into the hierarchy
  results.forEach((result: RegionalAggregation | RegionalAggregations, index: number) => {
    Object.values(AdminLevel).forEach((level) => {
      (result[level] || []).forEach((item: RegionAgg | { id: string; value: number }) => {
        if (!dict[level][item.id]) {
          // check if there is a similar region in the hierarchy
          console.log(
            "getRegionAggregation returned a region that doesn't exist in the hierarchy",
            dict,
            'result[level]',
            result[level],
            'level',
            level,
            'itemid',
            item.id,
            'allregion',
            allRegions
          );

          return;
        }

        // if we have item value, as in the normal regional aggregation use that.
        if (_.isFinite((item as { id: string; value: number }).value)) {
          // but only use that if we're not in regional aggregation, or we are and the specs id and item id match
          if (
            breakdownOption !== SpatialAggregationLevel.Region ||
            (breakdownOption === SpatialAggregationLevel.Region && specs[index].id === item.id)
          ) {
            dict[level][item.id].values[specs[index].id] = (
              item as { id: string; value: number }
            ).value;
          }
          // otherwise use the qualifier info to look up the data in item.values
        } else if ((item as RegionAgg).values?.[specs[index].id]) {
          dict[level][item.id].values[specs[index].id] = (item as RegionAgg).values?.[
            specs[index].id
          ];
        }
      });
    });
  });
  return {
    country: Object.values(dict.country),
    admin1: Object.values(dict.admin1),
    admin2: Object.values(dict.admin2),
    admin3: Object.values(dict.admin3),
  };
};

export const getBulkRegionalData = async (
  spec: BaseSpec,
  selectedTimestamps: string[],
  allTimestamps: string[],
  referenceSeries?: string[]
): Promise<BulkRegionalAggregationData> => {
  try {
    const { data } = await API.post(
      'maas/output/bulk-regional-data',
      {
        all_timestamps: allTimestamps,
        timestamps: selectedTimestamps,
      },
      {
        params: {
          aggForSelect: referenceSeries?.includes(ReferenceSeriesOption.SelectYears)
            ? 'mean'
            : null,
          aggForAll: referenceSeries?.includes(ReferenceSeriesOption.AllYears) ? 'mean' : null,
          data_id: spec.modelId,
          run_id: spec.runId,
          feature: spec.outputVariable,
          resolution: spec.temporalResolution,
          temporal_agg: spec.temporalAggregation,
          spatial_agg: spec.spatialAggregation,
          transform: spec.transform,
        },
      }
    );
    return data;
  } catch (e) {
    return {} as BulkRegionalAggregationData;
  }
};

export const getOutputStat = async (spec: OutputSpec): Promise<OutputStatWithZoom[]> => {
  try {
    const { data } = await API.get('/maas/output/stats', {
      params: {
        data_id: spec.modelId,
        run_id: spec.runId,
        feature: spec.outputVariable,
        resolution: spec.temporalResolution,
        temporal_agg: spec.temporalAggregation,
        spatial_agg: spec.spatialAggregation,
        timestamp: spec.timestamp,
      },
    });
    return data;
  } catch (e) {
    return [];
  }
};

export const getOutputStats = async (specs: OutputSpecWithId[]): Promise<OutputStatsResult[]> => {
  const results = await Promise.all(specs.map(getOutputStat));
  const stats = results.map((result, index) => {
    return {
      outputSpecId: specs[index].id,
      stats: result,
    };
  });
  return stats;
};

// not in use, but available from maas/output if aggregrate regional timeseries
// are ever implemented
/*
export const getAggregateTimeseries = async (
  spec: BaseSpec,
  regionIds: string[]
): Promise<any> => {
  try {
    const result = await API.post(
      'maas/output/aggregate-timeseries',
      {
        region_ids: regionIds
      },
      {
        params: {
          data_id: spec.modelId,
          run_id: spec.runId,
          feature: spec.outputVariable,
          resolution: spec.temporalResolution,
          temporal_agg: spec.temporalAggregation,
          spatial_agg: spec.spatialAggregation
        }
      }
    );
    return result;
  } catch (e) {
    return [];
  }
};
*/

export default {
  getTimeseries,
  getTimeseriesNormalized,
  getBulkTimeseries,
  getRawOutputData,
  getRawTimeseriesData,
  getRawTimeseriesDataBulk,
  getRawOutputDataByTimestamp,
  getRawQualifierTimeseries,
  getRawQualifierBreakdown,
  getQualifierCounts,
  getQualifierLists,
  getQualifierTimeseries,
  getQualifierBreakdown,
  getRegionLists,
  getRegionAggregation,
  getRegionAggregationWithQualifiers,
  getRegionAggregations,
  getBulkRegionalData,
  getOutputStat,
  getOutputStats,
};
