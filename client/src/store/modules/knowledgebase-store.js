/**
 * Used for knowledge-base related states
 */
export default {
  namespaced: true,
  state: {
    filteredStatementCount: 0,
    stagingStatementsCount: 0,
    documentsCount: 0,
    evidencesCount: 0,
    curationCounter: 0,
    isUpdatingBeliefScores: false
  },
  getters: {
    filteredStatementCount: state => state.filteredStatementCount,
    stagingStatementsCount: state => state.stagingStatementsCount,
    documentsCount: state => state.documentsCount,
    evidencesCount: state => state.evidencesCount,
    curationCounter: state => state.curationCounter,
    isUpdatingBeliefScores: state => state.isUpdatingBeliefScores
  },
  actions: {
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
    incrementCurationCounter({ commit }, curationCount) {
      commit('incrementCurationCounter', curationCount);
    },
    setIsUpdatingBeliefScores({ commit }, isUpdating) {
      commit('setIsUpdatingBeliefScores', isUpdating);
    }
  },
  mutations: {
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
    }
  }
};

