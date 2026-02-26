import { ModelOrDatasetState } from '@/types/Datacube';
import { DataState } from '@/types/Insight';
import { computed } from 'vue';
import { useInsightPanelStore } from '@/stores/insight-panel-store';

export default function useInsightStore() {
  const store = useInsightPanelStore();
  const getDataState = () => store.dataState;
  const getViewState = () => store.viewState;
  const modelOrDatasetState = computed<ModelOrDatasetState | null>(() => store.modelOrDatasetState);
  const setContextId = (contextId: string) => {
    store.setContextId([contextId]);
  };
  const clearContextId = () => {
    store.setContextId([]);
  };
  const setDataState = (newDataState: DataState | null) => {
    store.setDataState(newDataState);
  };
  const setViewState = (newViewState: object) => {
    store.setViewState(newViewState);
  };
  const setModelOrDatasetState = (newDataState: ModelOrDatasetState) => {
    store.setModelOrDatasetState(newDataState);
  };

  return {
    getDataState,
    getViewState,
    modelOrDatasetState,
    setContextId,
    clearContextId,
    setDataState,
    setViewState,
    setModelOrDatasetState,
  };
}
