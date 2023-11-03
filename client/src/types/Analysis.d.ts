import { DataSpaceDataState, ViewState } from '@/types/Insight';
import { BinningOptions, RegionRankingCompositionType } from './Enums';
import { ConceptNode, IndexProjectionSettings, IndexResultsSettings } from './Index';

export interface CachedDatacubeMetadata {
  featureName: string;
  datacubeName: string;
  source: string;
}
export interface AnalysisItem {
  // Generally a UUID that uniquely identifies one instance of a datacube in the
  //  analysis. However, under some circumstances this can be the the datacube's
  //  `id` or `data_id`. In those cases a UUID is not required to uniquely
  //  identify the instance.
  itemId: string;

  // Uniquely identifies a model or indicator's metadata document in ES.
  // Cannot be used to fetch data directly.
  id: string;

  // When combined with an output feature, can be used to fetch timeseries data.
  // Indicators in the same "collection"/"dataset" share a `dataId`, but differ
  //  by feature.
  // In DOJO, these are all grouped into one "indicator".
  // FIXME: rename to dataId to match the rest of the app
  datacubeId: string;

  // A selection of metadata that can be used to summarize the datacube without
  //  needing to fetch the full metadata object.
  cachedMetadata: CachedDatacubeMetadata;

  viewConfig: ViewState;
  dataConfig: DataSpaceDataState;

  selected: boolean;
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
}
