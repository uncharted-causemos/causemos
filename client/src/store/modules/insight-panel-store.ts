import { AnalyticalQuestion, Insight } from '@/types/Insight';
import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface InsightState {
  isPanelOpen: boolean;
  currentPane: string;
  countInsights: number;
  viewState: any;
  dataState: any;
  contextId: string[] | undefined;
  analysisId: string;
  updatedInsight: (Insight|AnalyticalQuestion) | null;
  insightList: (Insight|AnalyticalQuestion)[] | null;
  refreshDatacubes: boolean;
  reviewIndex: number;
  isReviewMode: boolean;
  currentReviewHeader: string
}

/**
 * Used for insight panel-related states
 */
const state: InsightState = {
  isPanelOpen: false,
  currentPane: '',
  countInsights: 0,
  viewState: {},
  dataState: {},
  contextId: undefined,
  analysisId: '',
  updatedInsight: null,
  insightList: null,
  refreshDatacubes: false,
  reviewIndex: 0,
  isReviewMode: false,
  currentReviewHeader: ''
};


const getters: GetterTree<InsightState, any> = {
  isPanelOpen: state => state.isPanelOpen,
  currentPane: state => state.currentPane,
  countInsights: state => state.countInsights,
  viewState: state => state.viewState,
  dataState: state => state.dataState,
  contextId: state => state.contextId,
  analysisId: state => state.analysisId,
  updatedInsight: state => state.updatedInsight,
  insightList: state => state.insightList,
  refreshDatacubes: state => state.refreshDatacubes,
  reviewIndex: state => state.reviewIndex,
  isReviewMode: state => state.isReviewMode,
  currentReviewHeader: state => state.currentReviewHeader
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
  setUpdatedInsight: ({ commit }, newValue) => {
    commit('setUpdatedInsight', newValue);
  },
  setRefreshDatacubes: ({ commit }, newValue) => {
    commit('setRefreshDatacubes', newValue);
  },
  setInsightList: ({ commit }, newValue) => {
    commit('setInsightList', newValue);
  },
  setReviewIndex: ({ commit }, newValue) => {
    commit('setReviewIndex', newValue);
  },
  setReviewMode: ({ commit }, newValue) => {
    commit('setReviewMode', newValue);
  },
  setCurrentReviewHeader: ({ commit }, newValue) => {
    commit('setCurrentReviewHeader', newValue);
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
  setUpdatedInsight(state, value) {
    state.updatedInsight = value;
  },
  setInsightList(state, value) {
    state.insightList = value;
  },
  setRefreshDatacubes(state, value) {
    state.refreshDatacubes = value;
  },
  setReviewIndex(state, value) {
    state.reviewIndex = value;
  },
  setReviewMode(state, value) {
    state.isReviewMode = value;
  },
  setCurrentReviewHeader(state, value) {
    state.currentReviewHeader = value;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
