import { BASE_LAYER, DATA_LAYER } from '@/utils/map-util-new';

// @base/abstract type
export interface Snapshot {
  id?: string;
  description?: string;
  visibility: string; // public or private
  project_id?: string;

  // e.g., datacube-id, CAG-id, etc.
  context_id?: string[];

  url: string;

  view_state?: ViewState;

  // target-view can be used to control visibility (e.g., a saved insight that targets data space won't be visible in the model space)
  // target-view can also force re-direct the final url for restoring state, e.g., a saved insight during model publish page would redirects to comparative analysis page
  target_view: string[]; // main tab when the snapshot was saved, e.g., data, qualitative, quantitative.

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
  analytical_question: string[]; // question(s) this insight may answer
  thumbnail: string; // e.g., image url or base64 encoding
}

// @concrete type
export interface AnalyticalQuestion extends Snapshot {
  question: string;
  linked_insights: string[]; // has some insight (using their names/IDs) been linked to satisfy/answer this question?
}

// view-specific values (no data dependency)
export interface ViewState {
  // data space specific
  spatialAggregation?: string;
  temporalAggregation?: string;
  spatialResolution?: string;
  temporalResolution?: string;
  selectedAdminLevel?: number;
  isDescriptionView?: boolean;
  selectedOutputIndex?: number;
  selectedMapBaseLayer?: BASE_LAYER;
  selectedMapDataLayer?: DATA_LAYER;
  breakdownOption?: string | null;

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
  // data space specific
  selectedModelId?: string;
  selectedScenarioIds?: string[];
  selectedTimestamp?: number | null;
  selectedRegionIds?: string[];
  selectedQualifierValues?: string[];
  //
  datacubeTitles?: {datacubeName: string; datacubeOutputName: string}[];
  datacubeRegions?: string[];
  relativeTo?: string | null;

  // knowledge/model space specific
  selectedScenarioId?: string;
  selectedNode?: string;
  selectedEdge?: string; // src + des node names
  currentEngine?: string;
  modelName?: string;
  nodesCount?: number;

  // others
  // ...
  [propName: string]: any; // allow other properties to be added
}
