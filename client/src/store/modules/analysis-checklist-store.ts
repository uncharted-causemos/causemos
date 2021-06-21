import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface AnalysisChecklistState {
  questions: [];
}

const state: AnalysisChecklistState = {
  questions: []
};

const getters: GetterTree<AnalysisChecklistState, any> = {
  questions: state => state.questions
};

const actions: ActionTree<AnalysisChecklistState, any> = {
  setQuestions: ({ commit }, newValue) => {
    commit('setQuestions', newValue);
  }
};

const mutations: MutationTree<AnalysisChecklistState> = {
  setQuestions(state, value) {
    state.questions = value;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
