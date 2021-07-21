export interface ScenarioConstraint {
  concept: string;
  values: { step: number; value: number }[];
}

export interface ScenarioParameter {
  projection_start: number;
  num_steps: number;
  indicator_time_series_range: {
    start: number;
    end: number;
  };
  constraints: ScenarioConstraint[];
}


export interface ScenarioResult {
  concept: string;
  values: { timestamp: number; value: number } [];
  confidenceInterval: {
    upper: { timestamp: number; value: number } [];
    lower: { timestamp: number; value: number } [];
  };
}

export interface NewScenario {
  name: string;
  description: string;
  model_id: string;
  engine: string;
  is_valid: boolean;
  is_baseline: boolean;
  parameter?: ScenarioParameter;
  result?: ScenarioResult[];
  experiment_id?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  modified_at: number;
  model_id: string;
  engine: string;
  is_valid: boolean;
  is_baseline: boolean;
  parameter?: ScenarioParameter;
  result?: ScenarioResult[];
  experiment_id?: string;
}


export interface NodeScenarioData {
  initial_value: number;
  indicator_name?: string;
  indicator_time_series?: { timestamp: number; value: number }[];
  indicator_time_series_range: {
    start: number;
    end: number;
  };
  projection_start: number;
  scenarios: {
    id: string;
    is_baseline: string;
    is_valid: boolean;
    name: string;
    parameter?: ScenarioParameter;
    constraints?: { step: number; value: number }[];
    result?: {
      values: { timestamp: number; value: number } [];
      confidenceInterval: {
        upper: { timestamp: number; value: number } [];
        lower: { timestamp: number; value: number } [];
      };
    };
  }[];
}
export interface NodeParameter {
  id: string;
  concept: string;
  label: string;
  model_id?: string;
  modified_at?: number;
  parameter?: any; // FIXME maybe this can be specified
}

export interface EdgeParameter {
  id: string;
  source: string;
  target: string;
  model_id?: string;
  reference_ids: string[];
  modified_at?: number;
  parameter?: {
    weights: number[];
  };
  // User polarity is taken into account when the user sets an edge's polarity manually
  user_polarity: number | null; // FIXME: need better ways to handle special case nulls
  // Polarity is not stored on the backend, but computed locally from the fetched statements
  polarity?: number;
}

export interface SourceTargetPair {
  source: string;
  target: string;
}

export interface CAGModelParameter {
  num_steps: number;
  indicator_time_series_range: {
    start: number;
    end: number;
  };
  projection_start: number;
  engine: string;
}

export interface CAGModelSummary {
  id: string;
  project_id: string;
  name: string;
  parameter: CAGModelParameter;

  is_stale: boolean;
  is_ambiguous: boolean;
  is_quantified: boolean;
  status: number;

  created_at: number;
  modified_at: number;

  thumbnail_source?: string;
}

export interface CAGGraph {
  nodes: NodeParameter[];
  edges: EdgeParameter[];
}
