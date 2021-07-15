
// @base/abstract type
export interface Snapshot {
  id?: string;
  description?: string;
  visibility: string; // public or private
  project_id?: string;

  // e.g., datacube-id, CAG-id, etc.
  context_id?: string;

  url: string;

  view_state?: ViewState;

  // target-view can be used to control visibility (e.g., a saved insight that targets data space won't be visible in the model space)
  // target-view can also force re-direct the final url for restoring state, e.g., a saved insight during model publish page would redirects to comparative analysis page
  target_view: string; // main tab when the snapshot was saved, e.g., data, qualitative, quantitative.

  // actions to be applied before/after applying this snapshot
  //  these could for example be items that follow the Command design pattern to update state
  //  or a reference to some function to be executed
  pre_actions?: any; // e.g., remove noisy UI elements that should not be part of the snapshot image/context
  post_actions?: any; // e.g., highlight a sub-graph
  // components may be flagged to react to the actions in a given mode -> Karl's suggestion (editable, displayable, etc.)
}

// @concrete type
export interface Insight extends Snapshot {
  name: string;
  data_state?: DataState;
  is_default: boolean; // is this the default insight?
  analytical_question: string[]; // optional question this insight aims to answer
  thumbnail: string; // e.g., image url or base64 encoding
}

// @concrete type
export interface AnalyticalQuestion extends Snapshot {
  question: string;
  linked_insights: Insight[]; // has some insight(s) been linked to satisfy/answer this question?
}

// view-specific values (no data dependency)
export interface ViewState {
  // data space specific
  spatialAggregation?: string;
  temporalAggregation?: string;
  spatialResolution?: string;
  temporalResolution?: string;
  selectedAdminLevel?: string;
  isDescriptionView?: boolean;

  // knowledge/model space specific
  sensitivityToggle?: any;
  graphLayout?: any;
  cameraOrientation?: any;

  // others
  // ...
  [propName: string]: any; // allow other properties to be added
}

// data-specific context values
// data context/selection (metadata, CAG node, one or more model runs, etc.)
export interface DataState {
  // generic metadata (provenance, etc.)
  metadata?: any;

  filters?: any; // any filter options applied
  breakdownOptions?: any; // any grouping options applied

  // data space specific
  selectedModelId?: string;
  selectedScenarioIds?: string[];
  selectedTimestamp?: number;
  transform?: number; // i.e., relative to a specific run index

  // knowledge/model space specific
  cagNode?: any;
  cagID?: any;

  // others
  // ...
  [propName: string]: any; // allow other properties to be added
}
