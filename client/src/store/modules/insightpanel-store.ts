import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface InsightState {
  isPanelOpen: boolean;
  currentPane: string;
  countInsights: number;
  viewState: any;
  dataState: any;
  publishedModelId: string;
  projectId: string;
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
  publishedModelId: '',
  projectId: ''
};


const getters: GetterTree<InsightState, any> = {
  isPanelOpen: state => state.isPanelOpen,
  currentPane: state => state.currentPane,
  countInsights: state => state.countInsights,
  viewState: state => state.viewState,
  dataState: state => state.dataState,
  publishedModelId: state => state.publishedModelId,
  projectId: state => state.projectId
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
  setPublishedModelId: ({ commit }, newValue) => {
    commit('setPublishedModelId', newValue);
  },
  setProjectId: ({ commit }, newValue) => {
    commit('setProjectId', newValue);
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
  setPublishedModelId(state, value) {
    state.publishedModelId = value;
  },
  setProjectId(state, value) {
    state.projectId = value;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
