
// Types related to model/indicator run outputs

import { AdminLevel, TemporalResolutionOption, AggregationOption, DataTransform } from '@/types/Enums';
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

export interface QualifierBreakdownResponse {
  name: string;
  options: { name: string; value?: number }[];
}
export interface QualifierCountsResponse {
  thresholds: QualifierThresholds;
  counts: { [key: string]: number }; // Map of qualifier name to number of values
}
export interface QualifierListsResponse {
  [key: string]: string[]; // Map of qualifier names to a list of all values for that qualifier
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

export interface OutputVariableSpecs {
  name: string;
  display_name: string;
  temporalResolution: TemporalResolutionOption;
  temporalAggregation: AggregationOption;
  spatialAggregation: AggregationOption;
  transform: DataTransform;
}

