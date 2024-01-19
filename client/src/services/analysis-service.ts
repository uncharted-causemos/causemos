import _ from 'lodash';
import API from '@/api/api';
import {
  AnalysisItem,
  DataAnalysisState,
  RegionRankingItemStates,
  IndexAnalysisState,
  CountryFilter,
  ProjectionDateRange,
  AnalysisBackendDocument,
} from '@/types/Analysis';
import {
  BinningOptions,
  ComparativeAnalysisMode,
  RegionRankingCompositionType,
} from '@/types/Enums';
import { createNewOutputIndex } from '@/utils/index-tree-util';
import { createNewIndexResultsSettings } from '@/utils/index-results-util';
import { createNewIndexProjectionSettings } from '@/utils/index-projection-util';
import { DEFAULT_EARLIEST_YEAR, DEFAULT_LAST_YEAR } from '@/composables/useProjectionDates';
import { getId, getState } from '@/utils/analysis-util';
import { ModelOrDatasetState } from '@/types/Datacube';

/**
 * Get analysis by ID
 * @param {string} analysisId Analysis Id
 */
export const getAnalysis = async (analysisId: string): Promise<AnalysisBackendDocument> => {
  const result = await API.get(`analyses/${analysisId}`);
  return result.data;
};

/**
 * Get the state of the analysis with given Id
 * @param {String} analysisId Analysis Id
 */
export const getAnalysisState = async (
  analysisId: string
): Promise<DataAnalysisState | IndexAnalysisState | null> => {
  const analysis = await getAnalysis(analysisId);
  if (analysis) return analysis.state;
  return null;
};

/**
 * Saves analysis state
 * @param {string} analysisId Analysis Id
 * @param {object} state analysis state payload
 */
export const saveAnalysisState = async (
  analysisId: string,
  state: IndexAnalysisState | DataAnalysisState
) => {
  const result = await API.put(
    `analyses/${analysisId}`,
    { state },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return result.data;
};

/**
 * Update the analysis with given ID
 * @param {string} analysisId Analysis ID
 * @param {object} payload Analysis update payload
 * @param {string} [payload.title] Analysis title
 * @param {string} [payload.description] Analysis description
 */
export const updateAnalysis = async (
  analysisId: string,
  payload: { description: string } | { title: string }
) => {
  if (!payload) return console.error(new Error('payload object must be provided'));
  const analysis = await getAnalysis(analysisId);
  if (analysis) {
    const result = await API.put(
      `analyses/${analysisId}`,
      { ...analysis, ...payload },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return result.data;
  } else {
    return console.error(new Error('payload object must be provided'));
  }
};

/**
 * Get a list of analyses under given project Id
 * @param {string} projectId Project Id
 */
export const getAnalysesByProjectId = async (
  projectId: string
): Promise<AnalysisBackendDocument[]> => {
  const result = await API.get('analyses', { params: { project_id: projectId, size: 200 } });
  return result.data || [];
};

/**
 * Create a copy of the analysis with given Id
 * @param {string} analysisId Analysis Id
 */
export const duplicateAnalysis = async (analysisId: string, newName = '') => {
  const original = await getAnalysis(analysisId);
  const { id } = await createAnalysis(
    newName || `Copy of ${original.title}`,
    original.description,
    original.project_id,
    original.state
  );
  const duplicate = await getAnalysis(id);
  return duplicate;
};

/**
 * Delete the analysis with given Id
 * @param {string} analysisId Analysis Id
 */
export const deleteAnalysis = (analysisId: string) => {
  return API.delete(`analyses/${analysisId}`);
};

/**
 * Get analysis item by anaylsis ID and analysis item ID
 * @param {string} analysisId Analysis Id
 * @param {string} analysisItemId Analysis Item Id
 */
export const getAnalysisItem = async (
  analysisId: string,
  analysisItemId: string
): Promise<AnalysisItem> => {
  const result = await API.get(`analyses/${analysisId}/analysisitems/${analysisItemId}`);
  return result.data;
};

/**
 * Get analysis item state (ModelOrDatasetState) by anaylsis ID and analysis item ID
 * @param {string} analysisId Analysis Id
 * @param {string} analysisItemId Analysis Item Id
 */
export const getAnalysisItemState = async (
  analysisId: string,
  analysisItemId: string
): Promise<ModelOrDatasetState> => {
  const analysisItem = await getAnalysisItem(analysisId, analysisItemId);
  return getState(analysisItem);
};

/**
 * Update analysis item state for the analysis with given analysisId and analysisItemId
 * @param analysisId  Analysis Id
 * @param analysisItemId  Analysis Item Id
 * @param state ModelOrDatasetState
 */
export const updateAnalysisItemState = async (
  analysisId: string,
  analysisItemId: string,
  state: ModelOrDatasetState
) => {
  return await API.put(`analyses/${analysisId}/analysisitems/${analysisItemId}`, { state });
};

/**
 * Create a new DataAnalysisState object with each of its fields initialized to
 * a sensible default.
 */
export const createDataAnalysisObject = (analysisItems?: AnalysisItem[]): DataAnalysisState => {
  return {
    analysisItems: analysisItems ?? [],
    activeTab: ComparativeAnalysisMode.List,
    barCountLimit: 50,
    isBarCountLimitApplied: false,
    colorBinCount: 5,
    colorBinType: BinningOptions.Linear,
    regionRankingCompositionType: RegionRankingCompositionType.Intersection,
    regionRankingItemStates: calculateResetRegionRankingWeights(analysisItems ?? [], {}),
    selectedAdminLevel: 0,
    areRegionRankingRowsNormalized: false,
    selectedTimestamp: null,
    highlightedRegionId: '',
  };
};

export const defaultCountryFilters: CountryFilter[] = [
  {
    countryName: 'United States',
    active: false,
  },
  {
    countryName: 'Russia',
    active: false,
  },
  {
    countryName: 'China',
    active: false,
  },
];

export const defaultProjectionDateRange: ProjectionDateRange = {
  endMonth: 0,
  endYear: DEFAULT_LAST_YEAR,
  startMonth: 0,
  startYear: DEFAULT_EARLIEST_YEAR,
};

export const createIndexAnalysisObject = (): IndexAnalysisState => {
  return {
    index: createNewOutputIndex(),
    workBench: [],
    resultsSettings: createNewIndexResultsSettings(),
    projectionSettings: createNewIndexProjectionSettings(),
    countryFilters: defaultCountryFilters,
    countryContextForSnippets: '',
    projectionDateRange: defaultProjectionDateRange,
  };
};

/**
 * Finds the selected items in each list and compares their ids for equality.
 * Assumes that the order of selected items won't change unless an item was
 *  added or removed.
 * @param oldItems List of analysis items before potential change occurred.
 * @param newItems List after the potential change.
 * @returns True iff an item was selected or deselected.
 */
export const didSelectedItemsChange = (
  oldItems: AnalysisItem[],
  newItems: AnalysisItem[]
): boolean => {
  const oldSelectedItemIds = oldItems.filter((item) => item.selected).map((item) => item.id);
  const newSelectedItemIds = newItems.filter((item) => item.selected).map((item) => item.id);
  return !_.isEqual(oldSelectedItemIds, newSelectedItemIds);
};

export const calculateResetRegionRankingWeights = (
  analysisItems: AnalysisItem[],
  regionRankingItemStates: RegionRankingItemStates
) => {
  const selectedItemCount = analysisItems.filter((item) => item.selected).length;
  const equalWeight = 100 / selectedItemCount;
  const newStates = {} as RegionRankingItemStates;
  analysisItems.forEach((item) => {
    newStates[getId(item)] = {
      weight: item.selected ? equalWeight : 0,
      isInverted: regionRankingItemStates[getId(item)]?.isInverted ?? false,
    };
  });
  return newStates;
};

/**
 * Create new data analysis resource
 */
export const createAnalysis = async (
  title: string,
  description: string,
  projectId: string,
  state: DataAnalysisState | IndexAnalysisState
) => {
  const result = await API.post(
    'analyses',
    { title, description, project_id: projectId, state },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return result.data;
};
