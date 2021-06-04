export interface Period {
  gte: string;
  lte: string;
  resolution: string;
}

export interface ModelRunParameter {
  id: string;
  name: string;
  value: string;
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
  period: Period[];
  variable?: string; // indicator variable
  _search_score?: number;
}

export interface BreakdownData {
  [key: string]: { id: string; value: number }[];
}

export interface NamedBreakdownData {
  name: string;
  data: BreakdownData[];
}
