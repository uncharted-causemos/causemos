import API from '@/api/api';

export interface OutputSpec {
  id?: string; // Id that identifies this spec
  modelId: string;
  runId: string;
  outputVariable: string;
  temporalResolution: string;
  temporalAggregation: string;
  spatialAggregation: string;
  timestamp: number;
}

type RegionLevel = 'country' | 'admin1' | 'admin2' | 'admin3'
export interface RegionalAggregation {
  country: RegionAgg[];
  admin1: RegionAgg[];
  admin2: RegionAgg[];
  admin3: RegionAgg[];
  [key: string]: RegionAgg[];
}

interface RegionAgg {
  id: string; // Region id
  [key: string]: number | string;
}


export const getRegionAggregation = async (spec: OutputSpec): Promise<RegionalAggregation> => {
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
  const promises = specs.map(spec => {
    return getRegionAggregation({
      modelId: spec.modelId,
      runId: spec.runId,
      outputVariable: spec.outputVariable,
      temporalResolution: spec.temporalResolution,
      temporalAggregation: spec.temporalAggregation,
      spatialAggregation: spec.spatialAggregation,
      timestamp: spec.timestamp
    });
  });
  // Fetch and restructure the result
  const results = await Promise.all(promises);
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
