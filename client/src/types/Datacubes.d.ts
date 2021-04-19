
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


// any scenario data is represented as a map of {name, value}
export interface ScenarioData {
  [key: string]: string | number;
}

export interface DimensionData {
  type: string; // 'input', 'output', 'drilldown'
  name: string;
  description: string;
  default: string | number;
  choices?: Array<string>;
}

export interface ScenarioDef {
  id: string;
  model: string;
}
