
// Types related to model/indicator run outputs

import { AdminLevel } from '@/types/Enums';
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
export type RegionalData = {
  [key in AdminLevel]?: { id: string; value: number }[];
}
export type RegionalAggregation = {
  [key in AdminLevel]?: RegionAgg[];
}
export interface RegionAgg {
  id: string; // Region id
  values: {[key: string]: number};
}
