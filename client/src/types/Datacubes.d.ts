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

// any scenario data is represented as a map of {name, value}
export interface ScenarioData {
  [key: string]: string | number;
}

export interface DimensionData {
  type: string;
  is_drilldown?: boolean;
  is_output?: boolean;
  name: string;
  display_name: string;
  description: string;
  default: string | number;
  choices?: Array<string>;
}

export interface ScenarioDef {
  run_id: string;
  id: string;
  model: string;
}
