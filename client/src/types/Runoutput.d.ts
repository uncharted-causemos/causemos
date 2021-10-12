
// Types related to model/indicator run outputs

import { AdminLevel } from '@/types/Enums';
import { AnalysisMapRange } from './Common';
import { PreGeneratedModelRunData } from './ModelRun';

export interface OutputSpecWithId extends OutputSpec {
  id: string; // User defined id for identifying the output for this spec
}

export interface OutputStatWithZoom extends AnalysisMapRange {
  zoom: number;
}

export interface OutputStatsResult {
  outputSpecId: string;
  stats: OutputStatWithZoom[];
}

export interface OutputSpec {
  modelId: string;
  runId: string;
  outputVariable: string;
  temporalResolution: string;
  temporalAggregation: string;
  spatialAggregation: string;
  timestamp: number;
  preGeneratedOutput?: PreGeneratedModelRunData[];
}
export type RegionalAggregation = {
  [key in AdminLevel]?: {
    id: string;
    value?: number;
    values?: Record<string, number>;
  }[];
}
export type RegionalAggregations = {
  [key in AdminLevel]?: RegionAgg[];
}
export interface RegionAgg {
  id: string; // Region id
  values: {[key: string]: number};
}
