/**
 * Stores models-related states
 */
export default {
  namespaced: true,
  state: {
    selectedScenarioId: null
  },
  getters: {
    selectedModel: (state, getters, rootState /*, rootGetters */) => {
      return rootState.route.params.selectedModel;
    },
    selectedScenarioId: state => state.selectedScenarioId
  },
  actions: {
    setSelectedScenarioId({ commit }, id) {
      commit('setSelectedScenarioId', id);
    }
  },
  mutations: {
    setSelectedScenarioId(state, id) {
      state.selectedScenarioId = id;
    }
  }
};
