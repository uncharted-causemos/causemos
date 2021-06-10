import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface InsightState {
  isPanelOpen: boolean;
  currentPane: string;
  countInsights: number;
}

/**
 * Used for insight panel-related states
 */
const state: InsightState = {
  isPanelOpen: false,
  currentPane: '',
  countInsights: 0
};


const getters: GetterTree<InsightState, any> = {
  isPanelOpen: state => state.isPanelOpen,
  currentPane: state => state.currentPane,
  countInsights: state => state.countInsights
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
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
