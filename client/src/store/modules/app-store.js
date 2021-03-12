/**
 * Used for system-wide states
 */
export default {
  namespaced: true,
  state: {
    overlayActivated: false,
    overlayMessage: 'Loading...',
    updateToken: '',
    ontologyConcepts: [],
    projectMetadata: {},
    conceptDefinitions: {}
  },
  getters: {
    project: (state, getters, rootState /*, rootGetters */) => {
      return rootState.route.params.project || null;
    },
    // collection id DEPRECATED, use project
    collection: (state, getters, rootState /*, rootGetters */) => {
      return rootState.route.params.project || null;
    },
    currentView: (state, getters, rootState /* , rootGetters */) => {
      const view = rootState.route.name || 'home';
      return view;
    },
    currentCAG: (state, getters, rootState /*, rootGetters */) => {
      return rootState.route.params.currentCAG || null;
    },
    overlayActivated: state => state.overlayActivated,
    overlayMessage: state => state.overlayMessage,
    updateToken: state => state.updateToken,
    ontologyConcepts: state => state.ontologyConcepts,
    projectMetadata: state => state.projectMetadata,
    conceptDefinitions: state => state.conceptDefinitions
  },
  actions: {
    enableOverlay({ commit }, message) {
      commit('enableOverlay', message);
    },
    disableOverlay({ commit }) {
      commit('disableOverlay');
    },
    setUpdateToken({ commit }, updateToken) {
      commit('setUpdateToken', updateToken);
    },
    setOntologyConcepts({ commit }, concepts) {
      commit('setOntologyConcepts', concepts);
    },
    setProjectMetadata({ commit }, metadata) {
      commit('setProjectMetadata', metadata);
    },
    setConceptDefinitions: ({ commit }, examples) => {
      commit('setConceptDefinitions', examples);
    }
  },
  mutations: {
    enableOverlay(state, message) {
      state.overlayMessage = message;
      state.overlayActivated = true;
    },
    disableOverlay(state) {
      state.overlayActivated = false;
    },
    setUpdateToken(state, updateToken) {
      state.updateToken = updateToken;
    },
    setOntologyConcepts(state, concepts) {
      state.ontologyConcepts = concepts;
    },
    setProjectMetadata(state, metadata) {
      state.projectMetadata = metadata;
    },
    setConceptDefinitions(state, definitions) {
      state.conceptDefinitions = definitions;
    }
  }
};
