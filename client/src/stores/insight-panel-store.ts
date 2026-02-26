import { ref } from 'vue';
import { defineStore } from 'pinia';
import { ModelOrDatasetState } from '@/types/Datacube';
import { DataState } from '@/types/Insight';

export const useInsightPanelStore = defineStore('insightPanel', () => {
  const viewState = ref<any>({});
  const dataState = ref<DataState | null>(null);
  const modelOrDatasetState = ref<ModelOrDatasetState | null>(null);
  const contextId = ref<string[] | undefined>(undefined);
  const analysisId = ref('');

  function setViewState(value: any) {
    viewState.value = value;
  }
  function setDataState(value: DataState | null) {
    dataState.value = value;
  }
  function setModelOrDatasetState(value: ModelOrDatasetState | null) {
    modelOrDatasetState.value = value;
  }
  function setContextId(value: string[] | undefined) {
    contextId.value = value;
  }
  function setAnalysisId(value: string) {
    analysisId.value = value;
  }

  return {
    viewState,
    dataState,
    modelOrDatasetState,
    contextId,
    analysisId,
    setViewState,
    setDataState,
    setModelOrDatasetState,
    setContextId,
    setAnalysisId,
  };
});
