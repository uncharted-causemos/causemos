import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface ModelState {
  selectedScenarioId: string | null
}

const state: ModelState = {
  selectedScenarioId: null
};

const getters: GetterTree<ModelState, any> = {
  selectedModel: (state, getters, rootState /*, rootGetters */) => {
    return rootState.route.params.selectedModel;
  },
  selectedScenarioId: state => state.selectedScenarioId
};

const actions: ActionTree<ModelState, any> = {
  setSelectedScenarioId({ commit }, id) {
    commit('setSelectedScenarioId', id);
  }
};

const mutations: MutationTree<ModelState> = {
  setSelectedScenarioId(state, id) {
    state.selectedScenarioId = id;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
