
// Types related to model/indicator run outputs

import { AdminLevel } from '@/types/Enums';
import { AnalysisMapRange } from './Common';
import { PreGeneratedModelRunData } from './ModelRun';

export interface OutputSpec {
  modelId: string;
  runId: string;
  outputVariable: string;
  temporalResolution: string;
  temporalAggregation: string;
  spatialAggregation: string;
  timestamp: number;
  transform?: string
  preGeneratedOutput?: PreGeneratedModelRunData[];
  isDefaultRun: boolean;
}
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
export interface RegionAgg {
  id: string; // Region id
  values: {[key: string]: number};
}
export type RegionalAggregation = {
  [key in AdminLevel]?: { id: string; value: number }[];
}
export type RegionalAggregations = {
  [key in AdminLevel]?: RegionAgg[];
}

export interface RawOutputDataPoint {
  country: string;
  admin1: string;
  admin2: string;
  admin3: string;
  lat: number;
  lng: number;
  timestamp: number;
  value: number;
  [qualifier: string]: string;
}

export interface RawOutputGeoJsonFeature {
  type: 'Feature';
  geometry: { type: 'Point', coordinates: [number, number] }
  properties: RawOutputDataPoint
}
export interface RawOutputGeoJson {
  type: 'FeatureCollection';
  features: RawOutputGeoJsonFeature[]
}

