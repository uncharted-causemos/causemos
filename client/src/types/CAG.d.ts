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
  conept: string;
  values: { timestamp: number; value: number } [];
  confidenceInterval: {
    upper: { timestamp: number; value: number } [];
    lower: { timestamp: number; value: number } [];
  };
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
  parameter: ScenarioParameter | null;
  result: ScenarioResult[] | null;
  experiment_id: string | null;
}

export interface NodeParameter {
  id: string;
  concept: string;
  label: string;
  model_id: string;
  modified_at: number;
  parameter: any; // FIXME maybe this can be specified
}

export interface EdgeParameter {
  id: string;
  source: string;
  target: string;
  model_id: string;
  reference_ids: string[];
  modified_at: number;
  parameter: {
    weights: number[];
  };
  user_polarity: number;
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

  thumbnailSource: string | null;
}
