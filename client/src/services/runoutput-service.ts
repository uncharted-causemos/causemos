import API from '@/api/api';
import { DatacubeGeography } from '@/types/Common';
import { AdminLevel, DefaultAggregations } from '@/types/Enums';
import { OutputSpec, OutputSpecWithId, RegionalAggregations, RegionAgg, RegionalAggregation, OutputStatWithZoom, OutputStatsResult } from '@/types/Runoutput';

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
        timestamp: spec.timestamp
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
): Promise<RegionalAggregation> => {
  // TODO: Handle http error properly in the backend and respond with correct error code if necessary.
  //       Meanwhile just ignore the error.
  try {
    const { data } = await API.get('/maas/output/qualifier-regional', {
      params: {
        data_id: spec.modelId,
        run_id: 'indicator',
        feature: spec.outputVariable,
        resolution: spec.temporalResolution,
        temporal_agg: spec.temporalAggregation,
        spatial_agg: spec.spatialAggregation,
        timestamp: spec.timestamp,
        qualifier
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
  breakdownOption: string | null
): Promise<RegionalAggregations> => {
  // Fetch and restructure the result
  const results = await Promise.all(
    breakdownOption && !DefaultAggregations.includes(breakdownOption)
      ? specs.map((spec) => getRegionAggregationWithQualifiers(spec, breakdownOption))
      : specs.map(getRegionAggregation)
  );

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
  results.forEach((result, index) => {
    Object.values(AdminLevel).forEach(level => {
      (result[level] || []).forEach(item => {
        if (!dict[level][item.id]) {
          console.warn(
            "getRegionAggregation returned a region that doesn't exist in the hierarchy",
            item.id,
            allRegions
          );
          return;
        }
        // if we have item value, as in the normal regional aggregation, use that.
        if (item.value) {
          dict[level][item.id].values[specs[index].id] = item.value;
        // otherwise use the qualifier info to look up the data in item.values
        } else if (item.values?.[specs[index].id]) {
          dict[level][item.id].values[specs[index].id] = item.values?.[specs[index].id];
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
