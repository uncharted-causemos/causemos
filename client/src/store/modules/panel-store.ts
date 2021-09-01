import { GetterTree, MutationTree, ActionTree } from 'vuex';

/* Used for drilldown-related states */
interface PanelState {
  // @REVIEW
  // @FIXME: isPanelOpen is repeated in multiple stores for different reasons,
  //  so the logic should be reviewed in case it could be merged, and also regarding renaming it
  isPanelOpen: boolean;
  currentTab: string;
}

const state: PanelState = {
  isPanelOpen: false,
  currentTab: 'evidence'
};

const getters: GetterTree<PanelState, any> = {
  isPanelOpen: state => state.isPanelOpen,
  currentTab: state => state.currentTab
};

const actions: ActionTree<PanelState, any> = {
  showSidePanel: ({ commit }) => {
    commit('showSidePanel');
  },
  hideSidePanel: ({ commit }) => {
    commit('hideSidePanel');
  },
  setCurrentTab: ({ commit }, newValue) => {
    commit('setCurrentTab', newValue);
  }
};

const mutations: MutationTree<PanelState> = {
  showSidePanel(state) {
    state.isPanelOpen = true;
  },
  hideSidePanel(state) {
    state.isPanelOpen = false;
  },
  setCurrentTab(state, value) {
    state.currentTab = value;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
