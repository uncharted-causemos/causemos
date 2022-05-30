
// Types related to model/indicator run outputs

import { AdminLevel, TemporalResolutionOption, AggregationOption, DataTransform } from '@/types/Enums';
import { AnalysisMapRange } from './Common';
import { PreGeneratedModelRunData } from './ModelRun';

/**
 * BaseSpec is the basis for all the output data interface used mostly with the output/maas set of
 * endpoints for retrieving datacubes and indicators
 *
 * @interface BaseSpec
 * @modelId {string} id for the datacube or indicator - the back is data_id, consider renaming in future
 * @runId {string} id for the run of a given datacube
 * @outputVariable {string} id for the target output variable of the datacube
 * @temporalResolution {string} resolution of the time data in question e.g. months, years
 * @temporalAggegation {string} setting for aggregating the data over time to a mean or sum
 * @spatialAggregation {string} setting for aggregating the data for a region to a mean or sum
 * @transform {string} optional setting for transforming the data (per capita or normalization)
 */
export interface BaseSpec {
  modelId: string;
  runId: string;
  outputVariable: string;
  temporalResolution: string;
  temporalAggregation: string;
  spatialAggregation: string;
  transform?: string
}

/**
 * OutputSpec is the most common output data interface used mostly with the output/maas set of
 * endpoints for retrieving datacubes and indicators
 *
 * @interface OutputSpec
 * @modelId {string} id for the datacube or indicator - the back is data_id, consider renaming in future
 * @runId {string} id for the run of a given datacube
 * @outputVariable {string} id for the target output variable of the datacube
 * @temporalResolution {string} resolution of the time data in question e.g. months, years
 * @temporalAggegation {string} setting for aggregating the data over time to a mean or sum
 * @spatialAggregation {string} setting for aggregating the data for a region to a mean or sum
 * @timestamp {number} get data for a specific unix timestamp, optional
 * @isDefaultRun {boolean} set if this is the default run for a datacube, optional
 * @preGeneratedOutput {PreGeneratedModelRunData[]} any pregenerated data for the datacube model run, optional
 * @transform {string} any data transform settings for a datacube
 */
export interface OutputSpec extends BaseSpec {
  timestamp?: number;
  isDefaultRun?: boolean;
  preGeneratedOutput?: PreGeneratedModelRunData[];
}

export interface OutputSpecWithId extends OutputSpec {
  id: string; // User defined id for identifying the output for this spec
}

export interface OutputSpecWithRegionId extends OutputSpec {
  regionId?: string; // ids region for this spec if set
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

export interface FeatureConfig {
  name: string;
  display_name: string;
  temporalResolution: TemporalResolutionOption;
  temporalAggregation: AggregationOption;
  spatialAggregation: AggregationOption;
  transform: DataTransform;
}

export interface BulkRegionalAggregationData {
  all_agg: RegionalAggregation,
  select_agg: RegionalAggregation,
  regional_data: {
    data: RegionalAggregation,
    timestamp: string
  }[]
}
