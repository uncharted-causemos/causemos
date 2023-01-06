import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface SelectedNode {
  node: string | null;
}

interface SelectedEdge {
  source: string | null;
  target: string | null;
}

interface GraphState {
  selectedNode: SelectedNode | null;
  selectedEdge: SelectedEdge | null;
  selectedRelationships: Array<SelectedEdge>;
  selectedNodesCount: number;
  filteredNodesCount: number;
  filteredEdgesCount: number;
  selectedSubgraphEdges: Array<SelectedEdge>;
}

const state: GraphState = {
  selectedNode: { node: null },
  selectedEdge: { source: null, target: null },
  selectedRelationships: [],
  selectedNodesCount: 0,
  filteredNodesCount: 0,
  filteredEdgesCount: 0,
  selectedSubgraphEdges: [],
};

const getters: GetterTree<GraphState, any> = {
  selectedNode: (state) => state.selectedNode,
  selectedEdge: (state) => state.selectedEdge,
  selectedRelationships: (state) => state.selectedRelationships,
  selectedNodesCount: (state) => state.selectedNodesCount,
  filteredNodesCount: (state) => state.filteredNodesCount,
  filteredEdgesCount: (state) => state.filteredEdgesCount,
  selectedSubgraphEdges: (state) => state.selectedSubgraphEdges,
};

const actions: ActionTree<GraphState, any> = {
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
};

const mutations: MutationTree<GraphState> = {
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
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
