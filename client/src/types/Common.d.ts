import { DatacubeType } from '@/types/Enums';
import { DatacubeMaintainer } from './Datacube';

// Facet
export interface FacetBucket {
  key: string;
  value: number;
}

export interface Facets {
  [key: string]: FacetBucket[]
}

// Project metadata
export interface Project {
  id: string;
  kb_id: string;
  name: string;
  ontology: string | null;
  corpus_id: string | null;
  extended_at: number;
  modified_at: number;
  created_at: number;
  stat: { [key: string]: string | number };
}

export interface DomainProject {
  id?: string;
  name: string; // corresponds to a datacube family (family_name)
  description: string;
  modified_at?: number;
  created_at?: number;
  source: string;
  website: string;
  maintainer: DatacubeMaintainer[];
  type: DatacubeType; // e.g., model, indicator
  ready_instances: string[];
  draft_instances: string[];
}

export interface DatasetInfo {
  data_id: string,
  indicator_count: number,
  name: string,
  created_at: number,
  source?: string
}

// Used as a common interface between DomainProject and DatasetInfo with simplified fields
export interface DatacubeFamily {
  id: string;
  name: string;
  type: string;
  numReady: number;
  numDraft: number;
  source: string;
  modifiedAt: number;
}

export interface RuntimeStage {
  start_time: number;
  end_time: number;
}

export interface DataPipelineInfo {
  num_rows: number;
  num_missing_ts: number;
  num_invalid_ts: number;
  num_missing_val: number;
  region_levels?: string[];
  features?: string[];
  raw_count_threshold: number;
  has_tiles: boolean;
  has_monthly: number;
  has_annual: number;
  month_timeseries_size: { [feature: string]: number };
  year_timeseries_size: { [feature: string]: number };
  num_rows_per_feature: { [feature: string]: number };
}


// Side panel
export interface SidePanelTab {
  name: string;
  icon?: string;
  imgSrc?: string;
  isGreyscale?: string;
  badgeCount?: string;
}


export interface KnowledgeBase {
  id: string;
  name: string;
  ontology: string;
  created_at: number;
  corpus_id: string;
  corpus_index: string;
  corpus_parameter: any;
}

export interface DatacubeGeography {
  country: string[];
  admin1: string[];
  admin2: string[];
  admin3: string[];
}

export interface RegionalGADMDetail {
  country?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  code?: string; // unique GADM code
  bbox?: any;
  [key: string]: string;
}

export interface GeoRegionDetail {
  label: string;
  path: string;
  code: string; // unique GADM code
  bbox?: any; // mostly an array of arrays reflecting region bbox as [ [{left}, {top}], [{right}, {bottom}] ]
}

export interface DatacubePeriod {
  gte: number;
  lte: number;
}

// any scenario data is represented as a map of {name, value}
export interface ScenarioData {
  [key: string]: string | number;
}

export interface AnalysisMapRange {
  min: number;
  max: number;
}
export interface AnalysisMapFilter {
  id: string;
  range: AnalysisMapRange;
}

export interface MapLegendColor {
  color: string;
  label?: string;
  decor?: string; // optional label decorator to provide extra text in addition to the label text
}
export interface AnalysisMapColorOptions {
  scheme: string[];
  relativeToSchemes: string[][];
  scaleFn: Function;
  isContinuous: boolean;
  isDiverging: boolean;
  opacity: number;
}

export interface MapLayerStats {
  [key: string]: AnalysisMapRange;
}

export interface AnalysisMapStats {
  global: MapLayerStats;
  baseline: MapLayerStats;
  difference: MapLayerStats;
}


