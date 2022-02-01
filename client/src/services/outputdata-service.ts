import _ from 'lodash';
import API from '@/api/api';
import { DatacubeGeography } from '@/types/Common';
import { AdminLevel, SpatialAggregationLevel } from '@/types/Enums';
import {
  OutputSpec,
  OutputSpecWithId,
  RegionalAggregations,
  RegionAgg,
  RegionalAggregation,
  OutputStatWithZoom,
  OutputStatsResult,
  RawOutputDataPoint,
  RawOutputGeoJson
} from '@/types/Runoutput';
import isSplitByQualifierActive from '@/utils/qualifier-util';
import { filterRawDataByRegionIds } from '@/utils/outputdata-util';
import { TimeseriesPoint } from '@/types/Timeseries';

export const getRawOutputData = async (
  param: {
    dataId: string,
    runId: string,
    outputVariable: string
  }
): Promise<RawOutputDataPoint[]> => {
  // Fetching raw data is expensive and this function can be called by multiple functions in multiple places
  // simultaneously with same parameter set, cache the request and retrieve the result for the same request
  // from the cache to avoid overhead.
  const promise = API.get('/maas/output/raw-data', {
    params: {
      data_id: param.dataId,
      run_id: param.runId,
      feature: param.outputVariable
    }
  }).then(res => {
    // Remove invalid data points and make sure all values are number
    return res.data.filter((d: RawOutputDataPoint) => _.isNumber(d.value));
  });
  const data = await promise;
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
  console.log('raw data');
  console.log(rawData);
  const filteredData = param.regionId ? filterRawDataByRegionIds(rawData, [param.regionId]) : rawData;

  // Aggregate spatially and derive timeseries data
  const dataByTs = _.groupBy(filteredData, 'timestamp');
  const timeseries = Object.values(dataByTs).map(dataPoints => {
    const sum = dataPoints.reduce((prev, cur) => prev + cur.value, 0);
    return { timestamp: dataPoints[0].timestamp, value: param.spatialAgg === 'sum' ? sum : sum / dataPoints.length };
  });
  // TODO: sorting can be expensive for large number of datapoints, further investigate if there's more efficient way to keep the timestamp order.
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
) => {
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

export const getRawOutputGeoJsonByTimestamp = async (
  param: {
    dataId: string,
    runId: string,
    outputVariable: string,
    timestamp: number
  }
): Promise<RawOutputGeoJson> => {
  const geoJson = {
    type: 'FeatureCollection',
    features: []
  } as RawOutputGeoJson;
  const data = await getRawOutputDataByTimestamp(param);
  for (const d of data) {
    geoJson.features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
      properties: { ...d }
    });
  }
  return geoJson;
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
  getRegionAggregation,
  getRegionAggregations,
  getOutputStat,
  getOutputStats
};
