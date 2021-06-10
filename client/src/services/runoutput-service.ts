import API from '@/api/api';
import { OutputSpec, RegionalAggregation, RegionAgg, RegionLevel } from '@/types/runoutput';

export const getRegionAggregation = async (spec: OutputSpec): Promise<RegionalAggregation> => {
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
    country: {} as { [key: string]: RegionAgg},
    admin1: {} as { [key: string]: RegionAgg},
    admin2: {} as { [key: string]: RegionAgg},
    admin3: {} as { [key: string]: RegionAgg}
  };
  results.forEach((result, index) => {
    const rl: RegionLevel[] = ['country', 'admin1', 'admin2', 'admin3'];
    rl.forEach(level => {
      result[level].forEach(item => {
        if (!dict[level][item.id]) {
          dict[level][item.id] = { id: item.id };
        }
        dict[level][item.id][specs[index].id || index] = item.value;
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
