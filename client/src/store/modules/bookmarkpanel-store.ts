import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface BookmarkState {
  isPanelOpen: boolean,
  currentPane: string,
  countBookmarks: number
}

/**
 * Used for bookmark panel-related states
 */
const state: BookmarkState = {
  isPanelOpen: false,
  currentPane: '',
  countBookmarks: 0
};


const getters: GetterTree<BookmarkState, any> = {
  isPanelOpen: state => state.isPanelOpen,
  currentPane: state => state.currentPane,
  countBookmarks: state => state.countBookmarks
};


const actions: ActionTree<BookmarkState, any> = {
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
};


const mutations: MutationTree<BookmarkState> = {
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
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
