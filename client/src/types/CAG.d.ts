import { TimeseriesDistributionPoint, TimeseriesPoint } from './Timeseries';
import { TimeScale } from './Enums';

export interface GraphPath {
  path: string[];
  score?: number;
}

export interface ProjectionConstraint {
  step: number;
  value: number;
}

export interface ConceptProjectionConstraints {
  concept: string;
  values: ProjectionConstraint[];
}

export interface ScenarioParameter {
  projection_start: number;
  num_steps: number;

  // A list of constraints across all concepts
  constraints: ConceptProjectionConstraints[];
}

export interface ScenarioProjection {
  scenarioName: string;
  scenarioDesc: string;
  scenarioId: string;
  is_valid: boolean;
  parameter: ScenarioParameter;
  values: TimeseriesDistributionPoint[];
  constraints: { step: number; value: number }[];
}

export interface ScenarioResult {
  concept: string;
  values: TimeseriesDistributionPoint[];
}

export interface NewScenario {
  name: string;
  description: string;
  model_id: string;
  is_baseline: boolean;
  parameter: ScenarioParameter;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  modified_at: number;
  created_at: number;
  model_id: string;
  engine: string; // Deprecated
  is_valid: boolean;
  is_baseline: boolean;
  parameter: ScenarioParameter;
  result?: ScenarioResult[]; // FIXME: technically result is not a part of scenario in ES datastore
  experiment_id?: string;
}

export interface NodeScenarioData {
  indicator_name: string;
  indicator_id: string | null;
  indicator_time_series: TimeseriesPoint[];
  min: number;
  max: number;
  projection_start: number;
  history_range: number;
  time_scale: TimeScale;
  scenarios: {
    id: string;
    is_baseline: boolean;
    is_valid: boolean;
    name: string;
    description: string;
    parameter: ScenarioParameter;
    // A list of constraints for this one node in this one scenario
    constraints?: { step: number; value: number }[];
    result?: {
      values: TimeseriesDistributionPoint[];
    };
    created_at: number;
  }[];
}
export interface NodeParameter {
  id: string;
  concept: string;
  label: string;
  model_id?: string;
  modified_at?: number;
  components: string[];
  parameter?: any;
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
    engine_weights: { [key: string]: any };
  };
  // User polarity is taken into account when the user sets an edge's polarity manually
  user_polarity: number | null; // FIXME: need better ways to handle special case nulls
  // Polarity is not stored on the backend, but computed locally from the fetched statements
  polarity?: number;

  // Injected by getComponents API
  same?: number;
  opposite?: number;
  unknown?: number;
}

export interface SourceTargetPair {
  source: string;
  target: string;
}

export interface CAGModelParameter {
  num_steps: number; // Deprecated, should now be derived from time_scale
  history_range: number; // number in months
  projection_start: number;
  engine: string;
  time_scale: TimeScale;
}

export interface CAGModelSummary {
  id: string;
  project_id: string;
  name: string;
  parameter: CAGModelParameter;

  is_stale: boolean;
  is_ambiguous: boolean;
  is_quantified: boolean; // FIXME: Deprecated
  status: number; // FIXME: Deprecated

  engine_status: { [key: string]: number };

  created_at: number;
  modified_at: number;

  thumbnail_source?: string;

  data_analysis_id?: string;
}

export interface CAGGraph {
  nodes: NodeParameter[];
  edges: EdgeParameter[];
}
