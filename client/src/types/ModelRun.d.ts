import { ModelRunStatus } from '@/types/Enums';

export interface ModelRunParameter {
  name: string;
  value: string;
}

export interface ModelRunOutputAggregate {
  name: string;
  value: string;
}

export interface ModelRunRuntimeStage {
  start: number;
  end: number;
}

export interface PreGeneratedModelRunData {
  file: string; // url/path for the pre-generated resource
  timestamp?: number; // timestamp value associated with the resource
  type?: string; // resource type, e.g., image, video
  target?: string; // target component, e.g., map, timeseries, none
  coords?: {lat: number; long: number}[]; // geo coordinates of the rect region starting top-left, clock-wise
  description?: string; // accessory desc
}

// Model run metadata
export interface ModelRun {
  id: string;
  model_name: string;
  model_id: string;
  created_at: number;
  flow_id: string;
  use_case_id: string;
  data_paths: string[];
  pre_gen_output_paths: string[] | PreGeneratedModelRunData[];
  is_default_run: boolean;
  tags: string[];
  status: ModelRunStatus;
  parameters: ModelRunParameter[];
  output_agg_values: ModelRunOutputAggregate[];
  runtimes: {
    execution: ModelRunRuntimeStage;
    post_processing: ModelRunRuntimeStage;
  };
}
