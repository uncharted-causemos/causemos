import { DatacubeGeography, DatacubePeriod } from './Common';
import {
  DatacubeAttributeVariableType,
  DatacubeStatus,
  DatacubeType,
  ModelParameterDataType,
  TemporalResolution,
  ModelPublishingStepID,
  FeatureQualifierRoles
} from '@/types/Enums';
import { TimeseriesPoint } from './Timeseries';

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
  additional_options: {};
  tags: string[];
  choices?: string[]; // FIXME: this should be of type that match the 'type'
  min?: number;
  max?: number;
  is_visible?: boolean;
}

export type DimensionInfo = ModelParameter | DatacubeFeature;

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

export interface Datacube {
  id: string;
  data_id: string; // this is the actual one to be used to fetch data
  name: string;
  family_name: string;
  description: string;
  created_at: number;
  type: DatacubeType;
  category: string[];
  maintainer: DatacubeMaintainer;
  tags: string[];
  ontology_matches: OntologyMatch[];
  geography: DatacubeGeography;
  period: DatacubePeriod;
  outputs: DatacubeFeature[];
  validatedOutputs?: DatacubeFeature[];
  default_feature: string; // name of the primary output feature
  status: DatacubeStatus;
  _search: string;
  qualifier_outputs?: FeatureQualifier[];
  default_view: any; // object that will contain various default view configurations such as default aggregations
}

export interface Model extends Datacube {
  observed_data: string[];
  is_stochastic: boolean;
  parameters: ModelParameter[];
}

export interface Indicator extends Datacube {
  data_paths: string[];
}

export interface ModelPublishingStep {
  id: ModelPublishingStepID;
  completed: boolean;
  text: string;
}

export interface QualifierTimeseriesResponse {
  name: string;
  options: { name: string; timeseries: TimeseriesPoint[] }[];
}

export interface QualifierBreakdownResponse {
  name: string;
  options: { name: string; value: number }[];
}
