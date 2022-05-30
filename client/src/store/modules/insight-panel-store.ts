import { AnalyticalQuestion, DataState, Insight, ReviewPosition, SectionWithInsights } from '@/types/Insight';
import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface InsightState {
  isPanelOpen: boolean;
  currentPane: string;
  countInsights: number;
  viewState: any;
  dataState: DataState | null;
  contextId: string[] | undefined;
  analysisId: string;
  snapshotUrl: string | undefined;
  updatedInsight: (Insight|AnalyticalQuestion) | null;
  insightsBySection: SectionWithInsights[] | null;
  refreshDatacubes: boolean;
  // We can identify which section or insight we should be showing in the review
  //  modal by storing the ID of the current insight and the section to which it
  //  belongs.
  // If the whole object is null, that means the analyst hasn't started
  //  reviewing
  // If insightId is null, that means we're reviewing a section with no insights
  //  attached.
  positionInReview: ReviewPosition | null;
  shouldRefetchInsights: boolean;
}

/**
 * Used for insight panel-related states
 */
const state: InsightState = {
  isPanelOpen: false,
  currentPane: '',
  countInsights: 0,
  viewState: {},
  dataState: null,
  contextId: undefined,
  analysisId: '',
  snapshotUrl: undefined,
  updatedInsight: null,
  insightsBySection: null,
  refreshDatacubes: false,
  positionInReview: null,
  shouldRefetchInsights: false
};


const getters: GetterTree<InsightState, any> = {
  isPanelOpen: state => state.isPanelOpen,
  currentPane: state => state.currentPane,
  countInsights: state => state.countInsights,
  viewState: state => state.viewState,
  dataState: state => state.dataState,
  contextId: state => state.contextId,
  analysisId: state => state.analysisId,
  snapshotUrl: state => state.snapshotUrl,
  updatedInsight: state => state.updatedInsight,
  insightsBySection: state => state.insightsBySection,
  refreshDatacubes: state => state.refreshDatacubes,
  positionInReview: state => state.positionInReview,
  shouldRefetchInsights: state => state.shouldRefetchInsights
};


const actions: ActionTree<InsightState, any> = {
  showInsightPanel: ({ commit }) => {
    commit('showInsightPanel');
  },
  hideInsightPanel: ({ commit }) => {
    commit('hideInsightPanel');
  },
  setCurrentPane: ({ commit }, newValue) => {
    commit('setCurrentPane', newValue);
  },
  setCountInsights: ({ commit }, newValue) => {
    commit('setCountInsights', newValue);
  },
  setViewState: ({ commit }, newValue) => {
    commit('setViewState', newValue);
  },
  setDataState: ({ commit }, newValue) => {
    commit('setDataState', newValue);
  },
  setContextId: ({ commit }, newValue) => {
    commit('setContextId', newValue);
  },
  setAnalysisId: ({ commit }, newValue) => {
    commit('setAnalysisId', newValue);
  },
  setSnapshotUrl: ({ commit }, newValue) => {
    commit('setSnapshotUrl', newValue);
  },
  setUpdatedInsight: ({ commit }, newValue) => {
    commit('setUpdatedInsight', newValue);
  },
  setRefreshDatacubes: ({ commit }, newValue) => {
    commit('setRefreshDatacubes', newValue);
  },
  setInsightsBySection: ({ commit }, newValue) => {
    commit('setInsightsBySection', newValue);
  },
  setPositionInReview: ({ commit }, newValue) => {
    commit('setPositionInReview', newValue);
  },
  setShouldRefetchInsights: ({ commit }, newValue) => {
    commit('setShouldRefetchInsights', newValue);
  }
};


const mutations: MutationTree<InsightState> = {
  showInsightPanel(state) {
    state.isPanelOpen = true;
  },
  hideInsightPanel(state) {
    state.isPanelOpen = false;
  },
  setCurrentPane(state, value) {
    state.currentPane = value;
  },
  setCountInsights(state, value) {
    state.countInsights = value;
  },
  setViewState(state, value) {
    state.viewState = value;
  },
  setDataState(state, value) {
    state.dataState = value;
  },
  setContextId(state, value) {
    state.contextId = value;
  },
  setAnalysisId(state, value) {
    state.analysisId = value;
  },
  setSnapshotUrl(state, value) {
    state.snapshotUrl = value;
  },
  setUpdatedInsight(state, value) {
    state.updatedInsight = value;
  },
  setInsightsBySection(state, value) {
    state.insightsBySection = value;
  },
  setRefreshDatacubes(state, value) {
    state.refreshDatacubes = value;
  },
  setPositionInReview(state, value) {
    state.positionInReview = value;
  },
  setShouldRefetchInsights(state, value) {
    state.shouldRefetchInsights = value;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
