/**
 * Used for bookmark panel-related states
 */
export default {
  namespaced: true,
  state: {
    isPanelOpen: false,
    currentPane: '', // 'new-bookmark' or 'list-bookmarks'
    countBookmarks: 0
  },
  getters: {
    isPanelOpen: state => state.isPanelOpen,
    currentPane: state => state.currentPane,
    countBookmarks: state => state.countBookmarks
  },
  actions: {
    showBookmarkPanel: ({ commit }) => {
      commit('showBookmarkPanel');
    },
    hideBookmarkPanel: ({ commit }) => {
      commit('hideBookmarkPanel');
    },
    setCurrentPane: ({ commit }, newValue) => {
      commit('setCurrentPane', newValue);
    },
    setCountBookmarks: ({ commit }, newValue) => {
      commit('setCountBookmarks', newValue);
    }
  },
  mutations: {
    showBookmarkPanel(state) {
      state.isPanelOpen = true;
    },
    hideBookmarkPanel(state) {
      state.isPanelOpen = false;
    },
    setCurrentPane(state, value) {
      state.currentPane = value;
    },
    setCountBookmarks(state, value) {
      state.countBookmarks = value;
    }
  }
};
