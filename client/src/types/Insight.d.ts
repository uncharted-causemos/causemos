import { BASE_LAYER, DATA_LAYER, DATA_LAYER_TRANSPARENCY } from '@/utils/map-util-new';
import { COLOR, ColorScaleType } from '@/utils/colors-util';
import { DatacubeViewMode, DataTransform } from '@/types/Enums';
import { Filters } from './Filters';
import { FeatureConfig } from './Outputdata';
import { IndexProjectionCountry, IndexProjectionScenario, SelectableIndexElementId } from './Index';

// view-specific values (no data dependency)
export interface ViewState {
  // data space specific
  spatialAggregation?: string;
  temporalAggregation?: string;
  spatialResolution?: string;
  temporalResolution?: string;
  selectedAdminLevel?: number;
  selectedViewTab?: DatacubeViewMode;
  selectedOutputIndex?: number;
  selectedMapBaseLayer?: BASE_LAYER;
  selectedMapDataLayer?: DATA_LAYER;
  breakdownOption?: string | null;
  dataLayerTransparency?: DATA_LAYER_TRANSPARENCY;
  colorSchemeReversed?: boolean;
  colorSchemeName?: COLOR;
  colorScaleType?: ColorScaleType;
  numberOfColorBins?: number;

  analyticalQuestionOrder?: number; // a numeric index to save and restore each question order

  // others
  // ...
  [propName: string]: any; // allow other properties to be added
}

// data context/selection (metadata, CAG node, one or more model runs, etc.)
export interface DataSpaceDataState {
  selectedModelId: string;
  selectedScenarioIds: string[];
  selectedTimestamp: number | null;
  selectedRegionIds: string[];
  selectedRegionIdsAtAllLevels: {
    country: string[];
    admin1: string[];
    admin2: string[];
    admin3: string[];
  };
  selectedOutputVariables: string[];
  activeFeatures: FeatureConfig[];
  nonDefaultQualifiers: string[];
  selectedQualifierValues: string[];
  selectedYears: string[];
  selectedTransform: DataTransform;
  activeReferenceOptions: string[];
  selectedPreGenDataId: string;
  relativeTo: string | null;
  searchFilters: Filters; // lex-bar search queries
}

export interface IndexStructureDataState {
  selectedElementId: SelectableIndexElementId | null;
}

export interface IndexResultsDataState {
  isShowingKeyDatasets: boolean;
}

export interface IndexProjectionsDataState {
  isSingleCountryModeActive: boolean;
  selectedCountry: string;
  selectedCountries: IndexProjectionCountry[];
  scenarios: IndexProjectionScenario[];
  projectionStartYear: number;
  projectionStartMonth: number;
  projectionEndYear: number;
  projectionEndMonth: number;
  selectedNodeId: string | null;
  showDataOutsideNorm: boolean;
}

export type DataState =
  | DataSpaceDataState
  | DataAnalysisState
  | IndexStructureDataState
  | IndexStructureResultsState
  | IndexProjectionsDataState;

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

  modified_at?: number;
}

export interface AnnotationState {
  markerAreaState: any;
  cropAreaState: any;
  imagePreview: string;
}

// @concrete type
export interface Insight extends Snapshot {
  name: string;
  data_state?: DataState;
  is_default: boolean; // is this the default insight?
  analytical_question: string[]; // question(s) this insight may answer
  modified_at?: number;
}

// @concrete type
export interface InsightImage {
  id: string;
  thumbnail?: string; // e.g., image url or base64 encoding
  image: string; // e.g., image url or base64 encoding
}

// @concrete type
export interface FullInsight extends Insight, InsightImage {
  annotation_state?: AnnotationState;
}

// @concrete type
export interface AnalyticalQuestion extends Snapshot {
  question: string;
  linked_insights: string[]; // has some insight (using their names/IDs) been linked to satisfy/answer this question?
  tour_name?: string;
  modified_at?: number;
  view_state: ViewState;
}

export interface SectionWithInsights {
  section: AnalyticalQuestion;
  insights: FullInsight[];
}

export interface ReviewPosition {
  sectionId: string;
  insightId: string | null;
}

export interface InsightMetadata {
  insightLastUpdate: number;

  // Data space specific
  datacubes?: { datasetName: string; outputName: string; source: string }[];
}
