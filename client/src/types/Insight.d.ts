import { BASE_LAYER, DATA_LAYER, DATA_LAYER_TRANSPARENCY } from '@/utils/map-util-new';
import { COLOR, ColorScaleType } from '@/utils/colors-util';
import { DatacubeViewMode, DataTransform, InsightMetadataType } from '@/types/Enums';
import { Filters } from './Filters';
import { FeatureConfig } from './Outputdata';
import { IndexProjectionCountry, IndexProjectionScenario, SelectableIndexElementId } from './Index';
import { ModelOrDatasetState } from '@/types/Datacube';
import { Snippet } from '@/types/IndexDocuments';
import { MarkerAreaState } from 'markerjs2';
import { CropAreaState } from 'cropro';

// view-specific values (no data dependency)
export interface ViewState {
  // data space specific
  spatialAggregation?: string;
  temporalAggregation?: string;
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

export interface AnnotationState {
  markerAreaState: MarkerAreaState | undefined;
  cropAreaState: CropAreaState | undefined;
  imagePreview: string;
  originalImagePreview: string;
}

/**
 * When this type was created, it contained many optional fields, some of which
 *  were required for certain insight types, and always undefined for others.
 * We've since moved to a more structured approach where each insight type has
 *  its own interface, and the fields that are relevant to that type are
 *  specified explicitly.
 */
export interface LegacyInsight {
  id: string;
  description: string;
  project_id: string;
  // e.g., datacube-id, index-structure-id, etc.
  context_id?: string[];
  url: string;
  view_state?: ViewState;
  name: string;
  data_state?: DataState;
  modified_at: number;
  metadata?: {
    type: InsightMetadataType;
    [key: string]: any; // arbitrary json object for metadata
  };
}

export interface FullLegacyInsight extends LegacyInsight {
  thumbnail: string; // e.g., image url or base64 encoding
  image: string; // e.g., image url or base64 encoding
  annotation_state?: AnnotationState;
}

export interface AnalyticalQuestion {
  id: string;
  project_id: string;
  // e.g., datacube-id, index-structure-id, etc.
  context_id?: string[];
  question: string;
  // A list of IDs of insights that have been associated with this question
  linked_insights: string[];
  modified_at: number;
  view_state: ViewState;
}

export type UnpersistedAnalyticalQuestion = Omit<AnalyticalQuestion, 'id' | 'modified_at'>;

export interface DocumentSnippetInsightMetadata extends Snippet {
  type: InsightMetadataType.DocumentSnippet;
}

export type NewInsightMetadata = DocumentSnippetInsightMetadata;

/**
 * Abstract interface that should only be used as a base for other insight interfaces.
 */
export interface NewInsightBase {
  schemaVersion: number;
  id: string;
  name: string;
  description: string;
  project_id: string;
  modified_at?: number;
  metadata?: NewInsightMetadata;
  image: string; // e.g., image url or base64 encoding
  thumbnail: string; // e.g., image url or base64 encoding
  annotation_state?: AnnotationState;
  // A list (usually with one item) of artifact IDs that is used to determine whether this insight
  //  should be displayed in the insight list for a particular analysis item, index, etc.
  context_id: string[];
}

export type ModelOrDatasetStateView =
  // For when a model or dataset is opened from a data analysis (list of datacubes)
  | {
      view: 'analysisItemDrilldown';
      datacubeId: string;
      analysisId: string;
      analysisItemId: string;
    }
  // For when a model or dataset is opened from an index
  | { view: 'indexNodeDrilldown'; datacubeId: string; analysisId: string; nodeId: string }
  | {
      view: 'indexProjectionsNodeDrilldown';
      datacubeId: string;
      analysisId: string;
      nodeId: string;
    };
export interface ModelOrDatasetStateInsight extends NewInsightBase {
  type: 'ModelOrDatasetStateInsight';
  view: ModelOrDatasetStateView;
  state: ModelOrDatasetState;
}

export type NewInsight = ModelOrDatasetStateInsight;

type FieldsCreatedByBackend = 'id' | 'modified_at' | 'thumbnail';

/** An insight that has been created but not yet saved to the backend data store. */
export type UnpersistedInsight =
  | Omit<FullLegacyInsight, FieldsCreatedByBackend>
  | Omit<NewInsight, FieldsCreatedByBackend>;

export interface SectionWithInsights {
  section: AnalyticalQuestion;
  insights: (FullLegacyInsight | NewInsight)[];
}

export type ReviewPosition =
  // The question title slide should be visible
  | {
      sectionId: string;
      insightId: null;
    }
  // We're reviewing an insight outside of the question list
  | {
      sectionId: null;
      insightId: string;
    }
  // We're reviewing an insight within a question in the question list
  | {
      sectionId: string;
      insightId: string;
    };

export interface InsightMetadata {
  insightLastUpdate: number;

  // Data space specific
  datacubes?: { datasetName: string; outputName: string; source: string }[];
}
