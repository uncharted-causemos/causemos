import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface ContextInsightState {
  isPanelOpen: boolean;
  currentPane: string;
  countContextInsights: number;
  refetchInsights: boolean;
}

/**
 * Used for context-insight panel-related states
 */
const state: ContextInsightState = {
  isPanelOpen: false,
  currentPane: '',
  countContextInsights: 0,
  refetchInsights: false
};


const getters: GetterTree<ContextInsightState, any> = {
  isPanelOpen: state => state.isPanelOpen,
  currentPane: state => state.currentPane,
  countContextInsights: state => state.countContextInsights,
  shouldRefetchInsights: state => state.refetchInsights
};


const actions: ActionTree<ContextInsightState, any> = {
  showContextInsightPanel: ({ commit }) => {
    commit('showContextInsightPanel');
  },
  hideContextInsightPanel: ({ commit }) => {
    commit('hideContextInsightPanel');
  },
  setCurrentPane: ({ commit }, newValue) => {
    commit('setCurrentPane', newValue);
  },
  setCountContextInsights: ({ commit }, newValue) => {
    commit('setCountContextInsights', newValue);
  },
  setRefetchInsights: ({ commit }, newValue) => {
    commit('setRefetchInsights', newValue);
  }
};


const mutations: MutationTree<ContextInsightState> = {
  showContextInsightPanel(state) {
    state.isPanelOpen = true;
  },
  hideContextInsightPanel(state) {
    state.isPanelOpen = false;
  },
  setCurrentPane(state, value) {
    state.currentPane = value;
  },
  setCountContextInsights(state, value) {
    state.countContextInsights = value;
  },
  setRefetchInsights(state, value) {
    state.refetchInsights = value;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
