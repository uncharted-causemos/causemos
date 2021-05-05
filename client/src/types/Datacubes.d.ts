
import { ModelGeography } from './Common';

export interface Period {
  gte: string;
  lte: string;
  resolution: string;
}

export interface CubeParameter {
  id: string;
  value: string;
}

export interface ModelRunParameter {
  name: string;
  value: string;
}

// Model run metadata
export interface ModelRun {
  id: string;
  model_name: string;
  model_id: string;
  created_at: string;
  flow_id: string;
  data_paths: string[];
  pre_gen_output_paths: string[];
  is_default_run: boolean;
  tags: string[];
  parameters: ModelRunParameter[];
}

// New Datacube metadata
export interface Cube {
  id: string;
  description: string;
  name: string;
  created: string;
  job_id: string;
  model_id: string;
  data_paths: string[];
  pre_gen_output_paths: string[];
  default_run: boolean;
  tags: string[];
  geography: ModelGeography;
  periods: Period[];
  parameters: CubeParameter[];
}

// OLD datacube metadata
export interface Datacube {
  id: string;
  type: string;
  model: string;
  model_id: string;
  category: string[];
  model_description: string;
  label: string;
  maintainer: string;
  source: string;
  output_name: string;
  output_description: string;
  output_units: string;
  output_units_description: string;
  parameters: string[];
  parameter_descriptions: string[];
  concepts: { name: string; score: number }[];
  country: string[];
  admin1: string[];
  admin2: string[];
  period: { gte: string; lte: string }[];
  variable?: string; // indicator variable
  _search_score?: number;
}

export interface RegionalData {
  country?: { [timestamp: string]: { id: string; value: number }[] };
  admin1?: { [timestamp: string]: { id: string; value: number }[] };
  admin2?: { [timestamp: string]: { id: string; value: number }[] };
  admin3?: { [timestamp: string]: { id: string; value: number }[] };
  admin4?: { [timestamp: string]: { id: string; value: number }[] };
  admin5?: { [timestamp: string]: { id: string; value: number }[] };
  admin6?: { [timestamp: string]: { id: string; value: number }[] };
}

export interface ScenarioDef {
  run_id: string;
  id: string;
  model: string;
}
