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
  [aggregationLevel: string]: {
    id: string;
    values: { [modelRunId: string]: number };
  }[];
}

export interface NamedBreakdownData {
  id: string;
  name: string;
  totalDataLength: number; // Includes data not yet fetched
  data: BreakdownData;
}

export interface AdminRegionSets {
  country: Set<string>;
  admin1: Set<string>;
  admin2: Set<string>;
  admin3: Set<string>;
}

export interface QualifierFetchInfo {
  count: number;
  shouldFetchByDefault: boolean,
  maxAdminLevelWithRegionalTimeseries: number;
}
