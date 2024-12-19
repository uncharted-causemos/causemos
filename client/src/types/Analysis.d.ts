import {
  BinningOptions,
  IndexWeightingBehaviour,
  RegionRankingCompositionType,
} from '@/types/Enums';
import { ConceptNode, IndexProjectionSettings, IndexResultsSettings } from '@/types/Index';
import { ModelOrDatasetState } from '@/types/Datacube';

export interface CachedDatacubeMetadata {
  featureName: string;
  datacubeName: string;
  source: string;
}

export interface AnalysisItem {
  id: string; // Analysis item id
  datacubeId: string; // Datacube ES document id
  selected: boolean;
  state: ModelOrDatasetState;
}

export interface RegionRankingItemStates {
  [itemId: string]: { isInverted: boolean; weight: number };
}

export interface DataAnalysisState {
  analysisItems: AnalysisItem[];
  activeTab: ComparativeAnalysisMode;
  colorBinCount: number;
  // linear/quantile
  colorBinType: BinningOptions;
  selectedAdminLevel: number;
  // union/intersection
  regionRankingCompositionType: RegionRankingCompositionType;
  barCountLimit: number;
  isBarCountLimitApplied: boolean;
  areRegionRankingRowsNormalized: boolean;
  selectedTimestamp: number | null;
  highlightedRegionId: string;
  regionRankingItemStates: RegionRankingItemStates;
}

export interface CountryFilter {
  countryName: string;
  active: boolean;
}

export interface ProjectionDateRange {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
}

export interface IndexAnalysisState {
  /** Primary index tree */
  index: ConceptNode;
  /** Temporary index nodes or sub trees that are being edited and detached from the main index tree */
  workBench: ConceptNode[];
  weightingBehaviour: IndexWeightingBehaviour;
  /** Index results page settings */
  resultsSettings: IndexResultsSettings;
  /** Index projection page settings */
  projectionSettings: IndexProjectionSettings;
  /** List of countries to filter datasets by */
  countryFilters: CountryFilter[];
  /** Country context for snippets */
  countryContextForSnippets: string;
  /** date range for projection view */
  projectionDateRange: ProjectionDateRange;
}

export interface AnalysisBackendDocument {
  id: string;
  title: string;
  description: string;
  project_id: string;
  created_at: number;
  modified_at: number;
  state: IndexAnalysisState | DataAnalysisState;
}

export interface Analysis {
  analysisId: string;
  title: string;
  subtitle: string;
  description: string;
  type: string;
  modified_at: number;
  datacubesCount?: number;
  nodesWithDatasetsCount?: number;
  isFirstDatacubeAnIndicator: boolean;
}
