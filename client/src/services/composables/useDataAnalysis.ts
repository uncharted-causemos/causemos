import { AnalysisItem, CachedDatacubeMetadata, DataAnalysisState } from '@/types/Analysis';
import _ from 'lodash';
import { computed, Ref, ref, watch } from 'vue';
import { getAnalysis, saveAnalysisState } from '../analysis-service';
import { v4 as uuidv4 } from 'uuid';
import { DataSpaceDataState } from '@/types/Insight';
import {
  calculateResetRegionRankingWeights,
  createDataAnalysisObject,
  didSelectedItemsChange,
} from '../analysis-service-new';
import { BinningOptions, RegionRankingCompositionType } from '@/types/Enums';
import { MAX_ANALYSIS_DATACUBES_COUNT } from '@/utils/analysis-util';

// Whenever a change is made, wait SYNC_DELAY_MS before saving to the backend to
//  group requests together.
const SYNC_DELAY_MS = 500;

const saveState = _.debounce((analysisId, state: DataAnalysisState) => {
  saveAnalysisState(analysisId, state);
}, SYNC_DELAY_MS);

export function useDataAnalysis(analysisId: Ref<string>) {
  const analysisName = ref('');
  const analysisState = ref<DataAnalysisState>(createDataAnalysisObject());
  // Whenever analysisId changes, fetch the state for that analysis
  watch(
    [analysisId],
    async () => {
      if (!analysisId.value) return;
      const analysis = await getAnalysis(analysisId.value);
      analysisName.value = analysis?.title || '';
      analysisState.value = { ...createDataAnalysisObject(), ...analysis?.state };
    },
    { immediate: true }
  );
  const setAnalysisState = (newState: DataAnalysisState) => {
    analysisState.value = newState;
    saveState(analysisId.value, newState);
  };
  const updateAnalysisState = (partialState: Partial<DataAnalysisState>) => {
    const newState: DataAnalysisState = {
      ...analysisState.value,
      ...partialState,
    };
    setAnalysisState(newState);
  };

  const analysisItems = computed(() => analysisState.value.analysisItems);
  const setAnalysisItems = (newItems: AnalysisItem[]) => {
    const shouldResetWeights = didSelectedItemsChange(analysisItems.value, newItems);
    updateAnalysisState({ analysisItems: newItems });
    // If the list of selected items has changed, reset region ranking weights
    if (shouldResetWeights) {
      resetRegionRankingWeights();
    }
  };
  const removeAnalysisItem = (itemId: string) => {
    setAnalysisItems(analysisItems.value.filter((item) => item.itemId !== itemId));
  };
  const duplicateAnalysisItem = (itemId: string) => {
    const itemToDuplicate = analysisItems.value.find((item) => item.itemId === itemId);
    if (itemToDuplicate !== undefined) {
      const duplicatedItem = _.cloneDeep(itemToDuplicate);
      duplicatedItem.itemId = uuidv4();
      if (selectedAnalysisItems.value.length >= MAX_ANALYSIS_DATACUBES_COUNT) {
        duplicatedItem.selected = false;
      }
      setAnalysisItems([...analysisItems.value, duplicatedItem]);
    }
  };
  const toggleAnalysisItemSelected = (itemId: string) => {
    const items = _.cloneDeep(analysisItems.value);
    const itemToToggle = items.find((i) => i.itemId === itemId);
    if (itemToToggle) {
      itemToToggle.selected = !itemToToggle.selected;
      setAnalysisItems(items);
    }
  };
  const setAnalysisItemViewConfig = (itemId: string, viewConfig: any) => {
    const updatedAnalysisItems = _.cloneDeep(analysisItems.value);
    const analysisItem = updatedAnalysisItems.find((item) => item.itemId === itemId);
    if (analysisItem) {
      analysisItem.viewConfig = viewConfig;
      setAnalysisItems(updatedAnalysisItems);
    }
  };
  const setAnalysisItemDataState = (itemId: string, dataState: DataSpaceDataState) => {
    const updatedAnalysisItems = _.cloneDeep(analysisItems.value);
    const analysisItem = updatedAnalysisItems.find((item) => item.itemId === itemId);
    if (analysisItem) {
      analysisItem.dataConfig = dataState;
      setAnalysisItems(updatedAnalysisItems);
    }
  };
  const updateAnalysisItemCachedMetadata = (
    itemId: string,
    partialMetadata: Partial<CachedDatacubeMetadata>
  ) => {
    const updatedAnalysisItems = _.cloneDeep(analysisItems.value);
    const analysisItem = updatedAnalysisItems.find((item) => item.itemId === itemId);
    if (analysisItem) {
      const beforeChange = _.cloneDeep(analysisItem.cachedMetadata);
      analysisItem.cachedMetadata = {
        ...analysisItem.cachedMetadata,
        ...partialMetadata,
      };
      if (!_.isEqual(beforeChange, analysisItem.cachedMetadata)) {
        setAnalysisItems(updatedAnalysisItems);
      }
    }
  };
  const selectedAnalysisItems = computed(() => analysisItems.value.filter((item) => item.selected));

  const activeTab = computed(() => analysisState.value.activeTab);
  const setActiveTab = (newTab: string) => {
    updateAnalysisState({ activeTab: newTab });
  };

  const selectedAdminLevel = computed(() => analysisState.value.selectedAdminLevel);
  const setSelectedAdminLevel = (newAdminLevel: number) => {
    updateAnalysisState({ selectedAdminLevel: newAdminLevel });
  };

  const areRegionRankingRowsNormalized = computed(
    () => analysisState.value.areRegionRankingRowsNormalized
  );
  const toggleRegionRankingRowsNormalized = () => {
    const currentValue = areRegionRankingRowsNormalized.value;
    updateAnalysisState({ areRegionRankingRowsNormalized: !currentValue });
  };

  const colorBinCount = computed(() => analysisState.value.colorBinCount);
  const setColorBinCount = (newCount: number) => {
    updateAnalysisState({ colorBinCount: newCount });
  };
  const colorBinType = computed(() => analysisState.value.colorBinType);
  const setColorBinType = (newType: BinningOptions) => {
    updateAnalysisState({ colorBinType: newType });
  };

  const regionRankingCompositionType = computed(
    () => analysisState.value.regionRankingCompositionType
  );
  const setRegionRankingCompositionType = (newType: RegionRankingCompositionType) => {
    updateAnalysisState({ regionRankingCompositionType: newType });
  };

  const barCountLimit = computed(() => analysisState.value.barCountLimit);
  const setBarCountLimit = (newLimit: number) => {
    updateAnalysisState({ barCountLimit: newLimit });
  };
  const isBarCountLimitApplied = computed(() => analysisState.value.isBarCountLimitApplied);
  const toggleIsBarCountLimitApplied = () => {
    const currentValue = isBarCountLimitApplied.value;
    updateAnalysisState({ isBarCountLimitApplied: !currentValue });
  };

  const regionRankingItemStates = computed(() => analysisState.value.regionRankingItemStates);
  const resetRegionRankingWeights = () => {
    const newStates = calculateResetRegionRankingWeights(
      analysisItems.value,
      regionRankingItemStates.value
    );
    updateAnalysisState({ regionRankingItemStates: newStates });
  };
  const setRegionRankingWeights = (newWeights: { itemId: string; weight: number }[]) => {
    const newStates = _.cloneDeep(regionRankingItemStates.value);
    newWeights.forEach(({ itemId, weight }) => {
      newStates[itemId].weight = weight;
    });
    updateAnalysisState({ regionRankingItemStates: newStates });
  };
  const toggleIsItemInverted = (itemId: string) => {
    const newStates = _.cloneDeep(regionRankingItemStates.value);
    newStates[itemId].isInverted = !newStates[itemId].isInverted;
    updateAnalysisState({ regionRankingItemStates: newStates });
  };

  const highlightedRegionId = computed(() => analysisState.value.highlightedRegionId);
  const setHighlightedRegionId = (newRegionId: string) => {
    updateAnalysisState({ highlightedRegionId: newRegionId });
  };

  return {
    analysisName,
    analysisState,
    analysisItems,
    selectedAnalysisItems,
    activeTab,
    setActiveTab,
    setAnalysisItemViewConfig,
    setAnalysisItemDataState,
    updateAnalysisItemCachedMetadata,
    removeAnalysisItem,
    duplicateAnalysisItem,
    toggleAnalysisItemSelected,
    selectedAdminLevel,
    setSelectedAdminLevel,
    areRegionRankingRowsNormalized,
    toggleRegionRankingRowsNormalized,
    colorBinCount,
    setColorBinCount,
    colorBinType,
    setColorBinType,
    regionRankingCompositionType,
    setRegionRankingCompositionType,
    barCountLimit,
    setBarCountLimit,
    isBarCountLimitApplied,
    toggleIsBarCountLimitApplied,
    regionRankingItemStates,
    resetRegionRankingWeights,
    toggleIsItemInverted,
    setRegionRankingWeights,
    highlightedRegionId,
    setHighlightedRegionId,
    setAnalysisState,
  };
}
