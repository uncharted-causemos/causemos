import _ from 'lodash';
import API from '@/api/api';
import { DatacubeGeography } from '@/types/Common';
import {
  AdminLevel,
  SpatialAggregationLevel,
  AggregationOption
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
  QualifierListsResponse
} from '@/types/Outputdata';
import isSplitByQualifierActive from '@/utils/qualifier-util';
import { FIFOCache } from '@/utils/cache-util';
import { filterRawDataByRegionIds } from '@/utils/outputdata-util';
import { TimeseriesPoint } from '@/types/Timeseries';

const RAW_DATA_REQUEST_CACHE_SIZE = 20;
const rawDataRequestCache = new FIFOCache<Promise<RawOutputDataPoint[]>>(RAW_DATA_REQUEST_CACHE_SIZE);

export const getRawOutputData = async (
  param: {
    dataId: string,
    runId: string,
    outputVariable: string
  }
): Promise<RawOutputDataPoint[]> => {
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
        feature: param.outputVariable
      }
    }).then(res => {
      // Remove invalid data points and make sure all values are number
      return res.data.filter((d: RawOutputDataPoint) => _.isNumber(d.value));
    }).catch(() => {
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

export const getRawTimeseriesData = async (
  param: {
    dataId: string,
    runId: string,
    outputVariable: string,
    spatialAgg: string,
    regionId: string
  }
): Promise<TimeseriesPoint[]> => {
  const rawData = await getRawOutputData(param);
  const filteredData = param.regionId ? filterRawDataByRegionIds(rawData, [param.regionId]) : rawData;

  // Aggregate spatially and derive timeseries data
  const dataByTs = _.groupBy(filteredData, 'timestamp');
  const timeseries = Object.values(dataByTs).map(dataPoints => {
    const sum = dataPoints.reduce((prev, cur) => prev + cur.value, 0);
    return { timestamp: dataPoints[0].timestamp, value: param.spatialAgg === AggregationOption.Sum ? sum : sum / dataPoints.length };
  });
  // TODO: sorting can be expensive for large number of datapoints, further investigate if there's more efficient way to keep the timestamps in order.
  const result = _.sortBy(timeseries, 'timestamp');
  return result;
};

export const getRawTimeseriesDataBulk = async (
  param: {
    dataId: string,
    runId: string,
    outputVariable: string,
    spatialAgg: string,
  },
  regionIds: string[]
): Promise<{ region_id: string, timeseries: TimeseriesPoint[] }[]> => {
  const promises = regionIds.map(regionId => getRawTimeseriesData({ regionId, ...param }));
  const data = await Promise.all(promises);
  return data.map((series, index) => ({ region_id: regionIds[index], timeseries: series }));
};

export const getRawOutputDataByTimestamp = async (
  param: {
    dataId: string,
    runId: string,
    outputVariable: string,
    timestamp: number
  }
): Promise<RawOutputDataPoint[]> => {
  const rawData = await getRawOutputData(param);
  return rawData.filter(d => d.timestamp === param.timestamp);
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
) : Promise<QualifierBreakdownResponse[]> => {
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

export const getRegionAggregation = async (
  spec: OutputSpec
): Promise<RegionalAggregation> => {
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
        transform: spec.transform
      }
    });
    return data;
  } catch (e) {
    return { country: [], admin1: [], admin2: [], admin3: [] };
  }
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
        transform: spec.transform
      }
    });
    return data;
  } catch (e) {
    return { country: [], admin1: [], admin2: [], admin3: [] };
  }
};

export const getRegionAggregations = async (
  specs: OutputSpecWithId[],
  allRegions: DatacubeGeography,
  breakdownOption: string
): Promise<RegionalAggregations> => {
  // Fetch and restructure the result
  let results;

  if (isSplitByQualifierActive(breakdownOption)) {
    results = await Promise.all(specs.map((spec) => getRegionAggregationWithQualifiers(spec, breakdownOption)));
  // reduce duplicate calls without branching the more complex result processing logic.
  } else if (breakdownOption === SpatialAggregationLevel.Region) {
    const ret = await getRegionAggregation(specs[0]);
    results = new Array(specs.length).fill(ret) as RegionalAggregation[];
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
    admin3: {}
  } as {
    [key in AdminLevel]: { [key: string]: RegionAgg };
  };
  // FIXME: cast to make compatible with objects indexed by AdminLevel
  const _allRegions = allRegions as { [key in AdminLevel]: string[] };
  // Initialize dict with an entry for each region in the entire hierarchy,
  //  regardless of whether it exists in the fetched results
  Object.values(AdminLevel).forEach(adminLevel => {
    const selectedDictEntry = dict[adminLevel];
    if (_allRegions[adminLevel] !== undefined) {
      _allRegions[adminLevel].forEach(regionId => {
        // Sanity check
        if (selectedDictEntry[regionId] !== undefined) {
          console.error(
            `Hierarchy data contains duplicate entry for "${regionId}"`
          );
          return;
        }
        selectedDictEntry[regionId] = { id: regionId, values: {} };
      });
    }
  });
  // Insert results into the hierarchy
  results.forEach((result: RegionalAggregation|RegionalAggregations, index: number) => {
    Object.values(AdminLevel).forEach(level => {
      (result[level] || []).forEach((item: RegionAgg|{id: string; value: number}) => {
        if (!dict[level][item.id]) {
          // TODO: See useDatacubeHierarchy, 'None' regions may be filtered out
          console.warn(
            "getRegionAggregation returned a region that doesn't exist in the hierarchy",
            item.id,
            allRegions
          );
          return;
        }

        // if we have item value, as in the normal regional aggregation use that.
        if ((item as {id: string; value: number}).value) {
          // but only use that if we're not in regional aggregation, or we are and the specs id and item id match
          if (
            breakdownOption !== SpatialAggregationLevel.Region ||
            (breakdownOption === SpatialAggregationLevel.Region && specs[index].id === item.id)
          ) {
            dict[level][item.id].values[specs[index].id] = (item as {id: string; value: number}).value;
          }
        // otherwise use the qualifier info to look up the data in item.values
        } else if ((item as RegionAgg).values?.[specs[index].id]) {
          dict[level][item.id].values[specs[index].id] = (item as RegionAgg).values?.[specs[index].id];
        }
      });
    });
  });
  return {
    country: Object.values(dict.country),
    admin1: Object.values(dict.admin1),
    admin2: Object.values(dict.admin2),
    admin3: Object.values(dict.admin3)
  };
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
        timestamp: spec.timestamp
      }
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
      stats: result
    };
  });
  return stats;
};

export default {
  getRawOutputData,
  getRawTimeseriesData,
  getRawTimeseriesDataBulk,
  getRawOutputDataByTimestamp,
  getQualifierCounts,
  getQualifierLists,
  getQualifierTimeseries,
  getQualifierBreakdown,
  getRegionLists,
  getRegionAggregation,
  getRegionAggregationWithQualifiers,
  getRegionAggregations,
  getOutputStat,
  getOutputStats
};
