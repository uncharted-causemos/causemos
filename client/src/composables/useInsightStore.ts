import { AnalyticalQuestion, DataState, Insight } from '@/types/Insight';
import { useStore } from 'vuex';

export default function useInsightStore() {
  const store = useStore();
  const getDataState = () => store.getters['insightPanel/dataState'];
  const getViewState = () => store.getters['insightPanel/viewState'];
  const setSnapshotUrl = (url: any) => {
    store.dispatch('insightPanel/setSnapshotUrl', url);
  };
  const showInsightPanel = () => {
    store.dispatch('insightPanel/showInsightPanel');
  };
  const setUpdatedInsight = (updatedInsight: Insight | null) => {
    store.dispatch('insightPanel/setUpdatedInsight', updatedInsight);
  };
  const setCurrentPane = (newInsightPane: string) => {
    store.dispatch('insightPanel/setCurrentPane', newInsightPane);
  };
  const setInsightsBySection = (
    insightsBySection: { section: AnalyticalQuestion; insights: Insight[] }[]
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
  const setDataState = (newDataState: DataState | null) => {
    store.dispatch('insightPanel/setDataState', newDataState);
  };
  const setViewState = (newViewState: object) => {
    store.dispatch('insightPanel/setViewState', newViewState);
  };

  return {
    getDataState,
    getViewState,
    setSnapshotUrl,
    showInsightPanel,
    setUpdatedInsight,
    setCurrentPane,
    setInsightsBySection,
    setPositionInReview,
    setRefreshDatacubes,
    setContextId,
    setDataState,
    setViewState,
  };
}
