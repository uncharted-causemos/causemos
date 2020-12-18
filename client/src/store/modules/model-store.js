/**
 * Stores models-related states
 */
export default {
  namespaced: true,
  state: {
    projectionConfig: {},
    view: 'flow',
    selectedScenarioId: null
  },
  getters: {
    selectedModel: (state, getters, rootState /*, rootGetters */) => {
      return rootState.route.params.selectedModel;
    },
    projectionConfig: state => state.projectionConfig,
    selectedScenarioId: state => state.selectedScenarioId
  },
  actions: {
    setProjectionConfig({ commit }, value) {
      commit('setProjectionConfig', value);
    },
    setSelectedScenarioId({ commit }, id) {
      commit('setSelectedScenarioId', id);
    }
  },
  mutations: {
    setProjectionConfig(state, value) {
      state.projectionConfig = value;
    },
    setSelectedScenarioId(state, id) {
      state.selectedScenarioId = id;
    }
  }
};
