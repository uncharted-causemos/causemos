import { ModelOrDatasetState } from '@/types/Datacube';
import { DataState } from '@/types/Insight';
import { computed } from 'vue';
import { useStore } from 'vuex';

export default function useInsightStore() {
  const store = useStore();
  const getDataState = () => store.getters['insightPanel/dataState'];
  const getViewState = () => store.getters['insightPanel/viewState'];
  const modelOrDatasetState = computed<ModelOrDatasetState | null>(
    () => store.getters['insightPanel/modelOrDatasetState']
  );
  const setContextId = (contextId: string) => {
    store.dispatch('insightPanel/setContextId', [contextId]);
  };
  const clearContextId = () => {
    store.dispatch('insightPanel/setContextId', []);
  };
  const setDataState = (newDataState: DataState | null) => {
    store.dispatch('insightPanel/setDataState', newDataState);
  };
  const setViewState = (newViewState: object) => {
    store.dispatch('insightPanel/setViewState', newViewState);
  };
  const setModelOrDatasetState = (newDataState: ModelOrDatasetState) => {
    store.dispatch('insightPanel/setModelOrDatasetState', newDataState);
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
