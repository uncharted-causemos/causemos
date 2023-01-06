import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface KBState {
  filteredStatementCount: number;
  stagingStatementsCount: number;
  documentsCount: number;
  evidencesCount: number;
  curationCounter: number;
  isUpdatingBeliefScores: boolean;
}

/**
 * Used for knowledge-base related states
 */
const state: KBState = {
  filteredStatementCount: 0,
  stagingStatementsCount: 0,
  documentsCount: 0,
  evidencesCount: 0,
  curationCounter: 0,
  isUpdatingBeliefScores: false,
};

const getters: GetterTree<KBState, any> = {
  filteredStatementCount: (state) => state.filteredStatementCount,
  stagingStatementsCount: (state) => state.stagingStatementsCount,
  documentsCount: (state) => state.documentsCount,
  evidencesCount: (state) => state.evidencesCount,
  curationCounter: (state) => state.curationCounter,
  isUpdatingBeliefScores: (state) => state.isUpdatingBeliefScores,
};

const actions: ActionTree<KBState, any> = {
  setFilteredStatementCount({ commit }, cnt) {
    commit('setFilteredStatementCount', cnt);
  },
  setStagingStatementsCount({ commit }, cnt) {
    commit('setStagingStatementsCount', cnt);
  },
  setDocumentsCount({ commit }, cnt) {
    commit('setDocumentsCount', cnt);
  },
  setEvidencesCount({ commit }, cnt) {
    commit('setEvidencesCount', cnt);
  },
  resetCurationCounter({ commit }) {
    commit('resetCurationCounter');
  },
  incrementCurationCounter({ commit }, curationCounter) {
    commit('incrementCurationCounter', curationCounter);
  },
  setIsUpdatingBeliefScores({ commit }, isUpdating) {
    commit('setIsUpdatingBeliefScores', isUpdating);
  },
};

const mutations: MutationTree<KBState> = {
  setFilteredStatementCount(state, cnt) {
    state.filteredStatementCount = cnt;
  },
  setStagingStatementsCount(state, cnt) {
    state.stagingStatementsCount = cnt;
  },
  setDocumentsCount(state, cnt) {
    state.documentsCount = cnt;
  },
  setEvidencesCount(state, cnt) {
    state.evidencesCount = cnt;
  },
  resetCurationCounter(state) {
    state.curationCounter = 0;
  },
  incrementCurationCounter(state, curationCount) {
    state.curationCounter += curationCount;
  },
  setIsUpdatingBeliefScores(state, isUpdating) {
    state.isUpdatingBeliefScores = isUpdating;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
