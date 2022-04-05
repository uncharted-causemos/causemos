import { DatacubeGeography, DatacubePeriod, DataPipelineInfo, RuntimeStage } from './Common';
import {
  DatacubeAttributeVariableType,
  DatacubeStatus,
  DatacubeType,
  ModelParameterDataType,
  TemporalResolution,
  ModelPublishingStepID,
  FeatureQualifierRoles,
  GeoAttributeFormat
} from '@/types/Enums';

export interface DatacubeMaintainer {
  name: string;
  organization: string;
  email: string;
  website: string;
}

export interface OntologyMatch {
  name: string;
  score: number;
}

export interface DatacubeAttribute {
  name: string;
  display_name: string;
  description: string;
  type: DatacubeAttributeVariableType;
  unit: string;
  unit_description: string;
  ontologies: {
    concepts: OntologyMatch[];
    processes: OntologyMatch[];
    properties: OntologyMatch[];
  };
  additional_options: {
    geo_acceptable_levels?: string[]; // specific geo type flag
    geo_region_format?: GeoAttributeFormat; // specific geo type flag
    geo_bbox_format?: string;
    geo_omit_gadm_code_version?: boolean;
    date_display_format?: string; // when model param is of type date, how it should be displayed
    date_range_delimiter?: string;
    date_min?: string;
    date_max?: string;
    default_value_label?: string;
  };
  tags: string[];
  choices?: string[]; // FIXME: this should be of type that match the 'type'
  choices_labels?: string[]; // FIXME: this should be of type that match the 'type'
  min?: number;
  max?: number;
  is_visible?: boolean;
}

export interface ModelParameter extends DatacubeAttribute {
  is_drilldown: boolean;
  data_type: ModelParameterDataType;
  default: string;
}

export interface FeatureQualifier extends DatacubeAttribute {
  related_features: string[];
  roles: FeatureQualifierRoles[];
}

export interface DatacubeFeature extends DatacubeAttribute {
  is_primary: boolean;
  data_resolution: {
    temporal_resolution: TemporalResolution;
    spatial_resolution: number[];
  };
}

export type DimensionInfo = ModelParameter | DatacubeFeature;

export interface DatasetEditable {
  name: string,
  family_name: string;
  description: string,
  category: string[],
  maintainer: DatacubeMaintainer,
  tags: string[],
  domains: string[]
}

export interface Dataset extends DatasetEditable {
  created_at: number,
  geography: DatacubeGeography,
  period: DatacubePeriod,
  status: DatacubeStatus,
  runtimes: {
    queued: RuntimeStage;
    post_processing: RuntimeStage;
  };
  flow_id: string;
  data_info?: DataPipelineInfo;
}

export interface Datacube extends DatasetEditable {
  id: string;
  data_id: string; // this is the actual one to be used to fetch data
  created_at: number;
  type: DatacubeType;
  ontology_matches: OntologyMatch[];
  geography: DatacubeGeography;
  period: DatacubePeriod;
  outputs: DatacubeFeature[];
  validatedOutputs?: DatacubeFeature[];
  default_feature: string; // name of the primary output feature
  status: DatacubeStatus;
  _search: string;
  // FIXME: current metadata results have `null` qualifier_outputs
  //  we should either use undefined and keep qualifier_outputs optional,
  //  or use null and make the field required
  qualifier_outputs?: FeatureQualifier[] | null;
  default_view: any; // object that will contain various default view configurations such as default aggregations
  new_version_data_id?: string;
  sparkline?: number[];
}

export interface Model extends Datacube {
  observed_data: string[];
  is_stochastic: boolean;
  parameters: ModelParameter[];
}

export interface Indicator extends Datacube {
  data_paths: string[];
  runtimes: {
    queued: RuntimeStage;
    post_processing: RuntimeStage;
  };
  flow_id: string;
  data_info?: DataPipelineInfo;
}

export interface ModelPublishingStep {
  id: ModelPublishingStepID;
  completed: boolean;
  text: string;
}

export interface QualifierThresholds {
  // No data for qualifiers that have more values than this number
  max_count: number;
  // No regional timeseries for qualifiers that have more values than this number
  regional_timeseries_count: number;
  // No regional timeseries at admin levels greater than this number
  regional_timeseries_max_level: number;
}
