import { ModelOrDatasetState } from '@/types/Datacube';
import { AnalyticalQuestion, DataState, Insight, NewInsight } from '@/types/Insight';
import { computed } from 'vue';
import { useStore } from 'vuex';

export default function useInsightStore() {
  const store = useStore();
  const getDataState = () => store.getters['insightPanel/dataState'];
  const getViewState = () => store.getters['insightPanel/viewState'];
  const modelOrDatasetState = computed<ModelOrDatasetState | null>(
    () => store.getters['insightPanel/modelOrDatasetState']
  );
  const showInsightPanel = () => {
    store.dispatch('insightPanel/showInsightPanel');
  };
  const hideInsightPanel = () => store.dispatch('insightPanel/hideInsightPanel');
  const setUpdatedInsight = (updatedInsight: Insight | NewInsight | AnalyticalQuestion | null) => {
    store.dispatch('insightPanel/setUpdatedInsight', updatedInsight);
  };
  const setCurrentPane = (newInsightPane: string) => {
    store.dispatch('insightPanel/setCurrentPane', newInsightPane);
  };
  const setInsightsBySection = (
    insightsBySection: { section: AnalyticalQuestion; insights: (Insight | NewInsight)[] }[]
  ) => {
    store.dispatch('insightPanel/setInsightsBySection', insightsBySection);
  };
  const setPositionInReview = (position: { sectionId: string; insightId: string }) => {
    store.dispatch('insightPanel/setPositionInReview', position);
  };
  const setRefreshDatacubes = (newValue: boolean) => {
    store.dispatch('insightPanel/setRefreshDatacubes', newValue);
  };
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
    showInsightPanel,
    hideInsightPanel,
    setUpdatedInsight,
    setCurrentPane,
    setInsightsBySection,
    setPositionInReview,
    setRefreshDatacubes,
    setContextId,
    clearContextId,
    setDataState,
    setViewState,
    setModelOrDatasetState,
  };
}
