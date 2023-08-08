import _ from 'lodash';
import API from '@/api/api';
import {
  AnalysisItem,
  DataAnalysisState,
  RegionRankingItemStates,
  IndexAnalysisState,
  CountryFilter,
} from '@/types/Analysis';
import {
  BinningOptions,
  ComparativeAnalysisMode,
  ProjectType,
  RegionRankingCompositionType,
} from '@/types/Enums';
import { createNewOutputIndex } from '@/utils/index-tree-util';
import { createNewIndexResultsSettings } from '@/utils/index-results-util';
import { createNewIndexProjectionSettings } from '@/utils/index-projection-util';

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

export const createIndexAnalysisObject = (): IndexAnalysisState => {
  return {
    index: createNewOutputIndex(),
    workBench: [],
    resultsSettings: createNewIndexResultsSettings(),
    projectionSettings: createNewIndexProjectionSettings(),
    countryFilters: defaultCountryFilters,
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
    newStates[item.itemId] = {
      weight: item.selected ? equalWeight : 0,
      isInverted: regionRankingItemStates[item.itemId]?.isInverted ?? false,
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

export const openDatacubeDrilldown = async (
  id: string,
  itemId: string,
  router: any,
  project: string,
  analysisId: string
) => {
  router
    .push({
      name: 'data',
      params: {
        project: project,
        analysisId: analysisId,
        projectType: ProjectType.Analysis,
      },
      query: {
        datacube_id: id,
        item_id: itemId,
      },
    })
    .catch(() => {});
};
