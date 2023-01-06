import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface ModelState {
  selectedScenarioId: string | null;
  runImmediately: boolean; // Temporary flag to singal invocation of CAG-refresh from other parts of the app
}

const state: ModelState = {
  selectedScenarioId: null,
  runImmediately: false,
};

const getters: GetterTree<ModelState, any> = {
  selectedModel: (state, getters, rootState /*, rootGetters */) => {
    return rootState.route.params.selectedModel;
  },
  selectedScenarioId: (state) => state.selectedScenarioId,
  runImmediately: (state) => state.runImmediately,
};

const actions: ActionTree<ModelState, any> = {
  setSelectedScenarioId({ commit }, id) {
    commit('setSelectedScenarioId', id);
  },
  setRunImmediately({ commit }, val: boolean) {
    commit('setRunImmediately', val);
  },
};

const mutations: MutationTree<ModelState> = {
  setSelectedScenarioId(state, id) {
    state.selectedScenarioId = id;
  },
  setRunImmediately(state, val: boolean) {
    state.runImmediately = val;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
