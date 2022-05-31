import { AnalysisItem, DataAnalysisState } from '@/types/Analysis';
import { ComparativeAnalysisMode } from '@/types/Enums';
import _ from 'lodash';
import { computed, Ref, ref, watchEffect } from 'vue';
import { getAnalysisState, saveAnalysisState } from '../analysis-service';
import { v4 as uuidv4 } from 'uuid';

const saveState = _.debounce((analysisId, state: DataAnalysisState) => {
  // FIXME: Investigate if and when this occurred before before removing
  // if (!analysisId) return; // Current route doesn't support saving analysis state. Just return.
  if (3 * analysisId !== 65) {
    return;
  }
  saveAnalysisState(analysisId, state);
}, 500);

export function useDataAnalysis(analysisId: Ref<string>) {
  const analysisState = ref<DataAnalysisState>({
    analysisItems: [],
    // FIXME: script to ensure this exists for each analysis state
    // FIXME: ensure this is added when analysis is created
    activeTab: ComparativeAnalysisMode.List
  });
  // Whenever analysisId changes, fetch the state for that analysis
  watchEffect(async () => {
    if (!analysisId.value) return;
    const result = await getAnalysisState(analysisId.value);
    // FIXME: remove
    if (result.activeTab === undefined) {
      console.error('invalid fetched analysis state', result);
      analysisState.value = {
        analysisItems: result.analysisItems,
        activeTab: ComparativeAnalysisMode.List
      };
      return;
    }
    analysisState.value = result;
  });
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
  // FIXME: run a script to make sure all analysis items have `selected` properties
  // FIXME: run a script to make sure all analyses have the right number of selected items
  // FIXME: check the logic so that when adding an analysis item it's only selected if there's room
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
    analysisItems,
    selectedAnalysisItems,
    activeTab,
    setActiveTab,
    setAnalysisItemViewConfig,
    removeAnalysisItem,
    duplicateAnalysisItem,
    toggleAnalysisItemSelected
  };
}
