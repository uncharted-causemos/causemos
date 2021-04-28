
import { ModelGeography } from './Common';

export interface ModelMaintainer {
  name: string;
  organization: string;
  email: string;
  website: string;
}

export interface ModelAttribute {
  id: string;
  name: string;
  display_name: string;
  description: string;
  type: string;
  unit_description: string;
  concepts: [];
  additional_options: {};
  min?: number;
  max?: number;
}

export type DimensionInfo = ModelParameter | ModelFeatures;

export interface ModelParameter extends ModelAttribute {
  is_drilldown: true;
  depends_on: {};
  data_type: string;
  default: string;
  tags: string[];
  choices?: string[];

}

export interface ModelFeature extends ModelAttribute {
  unit: string;
  tags: string[];
  data_resolution: {
    temporal_resolution: string;
    spatial_resolution: number[];
  };
}

export interface Model {
  id: string;
  name: string;
  description: string;
  model: string;
  created: string;
  version: string;
  status: string;
  category: string[];
  maintainer: ModelMaintainer;
  image: string;
  type: string;
  stochastic: boolean;
  cube_count: number;
  tags: string[];
  geography: ModelGeography;
  parameters: ModelParameter[];
  outputs: ModelFeature[];
  source: string;
  model_dependencies: string[];
  observed_data: string[];
}
