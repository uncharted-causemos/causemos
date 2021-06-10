import API from '@/api/api';
import { AdminLevel } from '@/types/Enums';
import { OutputSpec, RegionalAggregation, RegionAgg, RegionalData } from '@/types/runoutput';

export const getRegionAggregation = async (spec: OutputSpec): Promise<RegionalData> => {
  // TODO: Handle http error properly in the backend and respond with correct error code if necessary.
  //       Meanwhile just ignore the error.
  try {
    const { data } = await API.get('/maas/output/regional-data', {
      params: {
        model_id: spec.modelId,
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

export const getRegionAggregations = async (specs: OutputSpec[]): Promise<RegionalAggregation> => {
  // Fetch and restructure the result
  const results = await Promise.all(specs.map(getRegionAggregation));

  const dict = {
    country: {},
    admin1: {},
    admin2: {},
    admin3: {}
  } as {
    [key in AdminLevel]: {[key: string]: RegionAgg };
  };
  results.forEach((result, index) => {
    Object.values(AdminLevel).forEach(level => {
      (result[level] || []).forEach(item => {
        if (!dict[level][item.id]) {
          dict[level][item.id] = { id: item.id, values: {} };
        }
        dict[level][item.id].values[specs[index].id || index] = item.value;
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

export default {
  getRegionAggregation,
  getRegionAggregations
};
