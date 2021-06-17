
import { DatacubeGeography, DatacubePeriod } from './Common';
import {
  DatacubeAttributeVariableType,
  DatacubeStatus,
  DatacubeType,
  ModelParameterDataType,
  TemporalResolution,
  ModelPublishingStepID
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
  additional_options: {};
  tags: string[];
  choices?: string[];
  min?: number;
  max?: number;
}

export type DimensionInfo = ModelParameter | DatacubeFeature;

export interface ModelParameter extends DatacubeAttribute {
  is_drilldown: boolean;
  data_type: ModelParameterDataType;
  default: string;
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
  name: string;
  description: string;
  created_at: number;
  type: DatacubeType;
  category: string[];
  maintainer: DatacubeMaintainer;
  tags: string[];
  geography: DatacubeGeography;
  period: DatacubePeriod;
  outputs: DatacubeFeature[];
  validatedOutputs?: DatacubeFeature[];
  status: DatacubeStatus;
  _search: string;
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
