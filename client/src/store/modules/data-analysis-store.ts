import _ from 'lodash';
import { GetterTree, MutationTree, ActionTree } from 'vuex';

const state = { currentAnalysisId: '' };

const getters: GetterTree<any, any> = {
  analysisId: state => state.currentAnalysisId
};

const actions: ActionTree<any, any> = {};

const mutations: MutationTree<any> = {};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
