/**
 * Stores graph-related states
 */
export default {
  namespaced: true,
  state: {
    selectedNode: { node: null },
    selectedEdge: { source: null, target: null },
    selectedRelationships: [],
    selectedNodesCount: 0,
    filteredNodesCount: 0,
    filteredEdgesCount: 0,
    selectedSubgraphEdges: []
  },
  getters: {
    selectedNode: state => state.selectedNode,
    selectedEdge: state => state.selectedEdge,
    selectedRelationships: state => state.selectedRelationships,
    selectedNodesCount: state => state.selectedNodesCount,
    filteredNodesCount: state => state.filteredNodesCount,
    filteredEdgesCount: state => state.filteredEdgesCount,
    selectedSubgraphEdges: state => state.selectedSubgraphEdges
  },
  actions: {
    setSelectedNode: ({ commit }, newValue) => {
      commit('setSelectedNode', newValue);
    },
    setSelectedEdge: ({ commit }, newValue) => {
      commit('setSelectedEdge', newValue);
    },
    setSelectedRelationships: ({ commit }, newValue) => {
      commit('setSelectedRelationships', newValue);
    },
    setSelectedNodesCount({ commit }, newValue) {
      commit('setSelectedNodesCount', newValue);
    },
    setFilteredNodesCount({ commit }, newValue) {
      commit('setFilteredNodesCount', newValue);
    },
    setFilteredEdgesCount({ commit }, newValue) {
      commit('setFilteredEdgesCount', newValue);
    },
    setSelectedSubgraphEdges({ commit }, newValue) {
      commit('setSelectedSubgraphEdges', newValue);
    },
    addCAG({ commit }, newValue) {
      commit('addCAG', newValue);
    }
  },
  mutations: {
    setSelectedNode(state, value) {
      state.selectedNode = value;
    },
    setSelectedEdge(state, value) {
      state.selectedEdge = value;
    },
    setSelectedRelationships(state, value) {
      state.selectedRelationships = value;
    },
    setSelectedNodesCount(state, value) {
      state.selectedNodesCount = value;
    },
    setFilteredNodesCount(state, value) {
      state.filteredNodesCount = value;
    },
    setFilteredEdgesCount(state, value) {
      state.filteredEdgesCount = value;
    },
    setSelectedSubgraphEdges(state, value) {
      state.selectedSubgraphEdges = value;
    }
  }
};
