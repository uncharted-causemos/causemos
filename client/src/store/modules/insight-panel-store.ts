import { ModelOrDatasetState } from '@/types/Datacube';
import { DataState } from '@/types/Insight';
import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface InsightState {
  viewState: any;
  dataState: DataState | null;
  modelOrDatasetState: ModelOrDatasetState | null;
  contextId: string[] | undefined;
  analysisId: string;
}

/**
 * Used for insight panel-related states
 */
const state: InsightState = {
  viewState: {},
  dataState: null,
  modelOrDatasetState: null,
  contextId: undefined,
  analysisId: '',
};

const getters: GetterTree<InsightState, any> = {
  viewState: (state) => state.viewState,
  dataState: (state) => state.dataState,
  modelOrDatasetState: (state) => state.modelOrDatasetState,
  contextId: (state) => state.contextId,
  analysisId: (state) => state.analysisId,
};

const actions: ActionTree<InsightState, any> = {
  setViewState: ({ commit }, newValue) => {
    commit('setViewState', newValue);
  },
  setDataState: ({ commit }, newValue) => {
    commit('setDataState', newValue);
  },
  setModelOrDatasetState: ({ commit }, newValue) => {
    commit('setModelOrDatasetState', newValue);
  },
  setContextId: ({ commit }, newValue) => {
    commit('setContextId', newValue);
  },
  setAnalysisId: ({ commit }, newValue) => {
    commit('setAnalysisId', newValue);
  },
};

const mutations: MutationTree<InsightState> = {
  setViewState(state, value) {
    state.viewState = value;
  },
  setDataState(state, value) {
    state.dataState = value;
  },
  setModelOrDatasetState(state, value) {
    state.modelOrDatasetState = value;
  },
  setContextId(state, value) {
    state.contextId = value;
  },
  setAnalysisId(state, value) {
    state.analysisId = value;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
