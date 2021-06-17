import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface ModelPublishState {
  currentOutputIndex: number;
}

/**
 * Used for model publish related states
 */
const state: ModelPublishState = {
  currentOutputIndex: 0
};


const getters: GetterTree<ModelPublishState, any> = {
  currentOutputIndex: state => state.currentOutputIndex
};


const actions: ActionTree<ModelPublishState, any> = {
  setCurrentOutputIndex: ({ commit }, value) => {
    commit('setCurrentOutputIndex', value);
  }
};


const mutations: MutationTree<ModelPublishState> = {
  setCurrentOutputIndex(state, value) {
    state.currentOutputIndex = value;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
