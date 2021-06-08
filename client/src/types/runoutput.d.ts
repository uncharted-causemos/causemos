
// Types related to model/indicator run outputs

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

export type RegionLevel = 'country' | 'admin1' | 'admin2' | 'admin3'
export interface RegionalAggregation {
  country: RegionAgg[];
  admin1: RegionAgg[];
  admin2: RegionAgg[];
  admin3: RegionAgg[];
  [key: string]: RegionAgg[]; // this is added to work around the typing error while trying to access the property by string. e.g. regionAggregation['country']
}

export interface RegionAgg {
  id: string; // Region id
  [key: string]: number | string;
}
