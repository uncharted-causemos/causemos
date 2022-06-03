import { AnalysisItem, DataAnalysisState } from '@/types/Analysis';
import { ComparativeAnalysisMode } from '@/types/Enums';
import _ from 'lodash';
import { computed, Ref, ref, watch } from 'vue';
import { getAnalysisState, saveAnalysisState } from '../analysis-service';
import { v4 as uuidv4 } from 'uuid';
import { DataSpaceDataState } from '@/types/Insight';

// Whenever a change is made, wait SYNC_DELAY_MS before saving to the backend to
//  group requests together.
const SYNC_DELAY_MS = 2500;

const saveState = _.debounce((analysisId, state: DataAnalysisState) => {
  saveAnalysisState(analysisId, state);
}, SYNC_DELAY_MS);

export function useDataAnalysis(analysisId: Ref<string>) {
  const analysisState = ref<DataAnalysisState>({
    analysisItems: [],
    activeTab: ComparativeAnalysisMode.List
  });
  // Whenever analysisId changes, fetch the state for that analysis
  watch([analysisId], async () => {
    if (!analysisId.value) return;
    const result = await getAnalysisState(analysisId.value);
    // FIXME: run script to ensure tab exists for each analysis then remove:
    if (result.activeTab === undefined) {
      console.error('invalid fetched analysis state', result);
      analysisState.value = {
        analysisItems: result.analysisItems,
        activeTab: ComparativeAnalysisMode.List
      };
      return;
    }
    analysisState.value = result;
  }, { immediate: true });
  const setAnalysisState = (newState: DataAnalysisState) => {
    analysisState.value = newState;
    saveState(analysisId.value, newState);
  };

  const analysisItems = computed(() => analysisState.value.analysisItems);
  const setAnalysisItems = (newItems: AnalysisItem[]) => {
    const newState: DataAnalysisState = {
      ...analysisState.value,
      analysisItems: newItems
    };
    setAnalysisState(newState);
  };
  const removeAnalysisItem = (itemId: string) => {
    setAnalysisItems(
      analysisItems.value.filter(item => item.itemId !== itemId)
    );
  };
  const duplicateAnalysisItem = (itemId: string) => {
    const itemToDuplicate = analysisItems.value.find(item => item.itemId === itemId);
    if (itemToDuplicate !== undefined) {
      const duplicatedItem = _.cloneDeep(itemToDuplicate);
      duplicatedItem.itemId = uuidv4();
      setAnalysisItems([...analysisItems.value, duplicatedItem]);
    }
  };
  const toggleAnalysisItemSelected = (itemId: string) => {
    const items = _.cloneDeep(analysisItems.value);
    const itemToToggle = items.find(i => i.itemId === itemId);
    if (itemToToggle) {
      itemToToggle.selected = !itemToToggle.selected;
      setAnalysisItems(items);
    }
  };
  const setAnalysisItemViewConfig = (itemId: string, viewConfig: any) => {
    const updatedAnalysisItems = _.cloneDeep(analysisItems.value);
    const analysisItem = updatedAnalysisItems.find(
      item => item.itemId === itemId
    );
    if (analysisItem) {
      analysisItem.viewConfig = viewConfig;
      setAnalysisItems(updatedAnalysisItems);
    }
  };
  const setAnalysisItemDataState = (
    itemId: string,
    dataState: DataSpaceDataState
  ) => {
    const updatedAnalysisItems = _.cloneDeep(analysisItems.value);
    const analysisItem = updatedAnalysisItems.find(
      item => item.itemId === itemId
    );
    if (analysisItem) {
      analysisItem.dataConfig = dataState;
      setAnalysisItems(updatedAnalysisItems);
    }
  };
  // FIXME: run a script to make sure all analysis items have `selected`
  //  properties, and to make sure all analyses have the right number of
  //  selected items
  const selectedAnalysisItems = computed(() => analysisItems.value.filter(item => item.selected));

  const activeTab = computed(() => analysisState.value.activeTab);
  const setActiveTab = (newTab: string) => {
    const newState: DataAnalysisState = {
      ...analysisState.value,
      activeTab: newTab
    };
    setAnalysisState(newState);
  };

  return {
    analysisState,
    analysisItems,
    selectedAnalysisItems,
    activeTab,
    setActiveTab,
    setAnalysisItemViewConfig,
    setAnalysisItemDataState,
    removeAnalysisItem,
    duplicateAnalysisItem,
    toggleAnalysisItemSelected,
    setAnalysisItems
  };
}
