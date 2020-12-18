/**
 * Used for side panel-related states
 */
export default {
  namespaced: true,
  state: {
    isPanelOpen: false,
    currentTab: 'evidence'
  },
  getters: {
    isPanelOpen: state => state.isPanelOpen,
    currentTab: state => state.currentTab
  },
  actions: {
    showSidePanel: ({ commit }) => {
      commit('showSidePanel');
    },
    hideSidePanel: ({ commit }) => {
      commit('hideSidePanel');
    },
    setCurrentTab: ({ commit }, newValue) => {
      commit('setCurrentTab', newValue);
    },
    setUpdateToken: ({ commit }, newValue) => {
      commit('setUpdateToken', newValue);
    }
  },
  mutations: {
    showSidePanel(state) {
      state.isPanelOpen = true;
    },
    hideSidePanel(state) {
      state.isPanelOpen = false;
    },
    setCurrentTab(state, value) {
      state.currentTab = value;
    }
  }
};
