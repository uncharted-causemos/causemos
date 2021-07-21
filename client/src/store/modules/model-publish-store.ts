import { ModelPublishingStepID, AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface ModelPublishState {
  currentOutputIndex: number;
  currentPublishStep: number;
  selectedTemporalAggregation: string;
  selectedTemporalResolution: string;
  selectedSpatialAggregation: string;
  selectedTimestamp: number | null;
  selectedScenarioIds: string[];
}

/**
 * Used for model publish related states
 */
const state: ModelPublishState = {
  currentOutputIndex: 0,
  currentPublishStep: ModelPublishingStepID.Enrich_Description,
  selectedTemporalAggregation: AggregationOption.Mean,
  selectedTemporalResolution: TemporalResolutionOption.Month,
  selectedSpatialAggregation: AggregationOption.Mean,
  selectedTimestamp: null,
  selectedScenarioIds: []
};


const getters: GetterTree<ModelPublishState, any> = {
  currentOutputIndex: state => state.currentOutputIndex,
  currentPublishStep: state => state.currentPublishStep,
  selectedTemporalAggregation: state => state.selectedTemporalAggregation,
  selectedTemporalResolution: state => state.selectedTemporalResolution,
  selectedSpatialAggregation: state => state.selectedSpatialAggregation,
  selectedTimestamp: state => state.selectedTimestamp,
  selectedScenarioIds: state => state.selectedScenarioIds
};


const actions: ActionTree<ModelPublishState, any> = {
  setCurrentOutputIndex: ({ commit }, value) => {
    commit('setCurrentOutputIndex', value);
  },
  setCurrentPublishStep: ({ commit }, value) => {
    commit('setCurrentPublishStep', value);
  },
  setSelectedTemporalAggregation: ({ commit }, value) => {
    commit('setSelectedTemporalAggregation', value);
  },
  setSelectedTemporalResolution: ({ commit }, value) => {
    commit('setSelectedTemporalResolution', value);
  },
  setSelectedSpatialAggregation: ({ commit }, value) => {
    commit('setSelectedSpatialAggregation', value);
  },
  setSelectedTimestamp: ({ commit }, value) => {
    commit('setSelectedTimestamp', value);
  },
  setSelectedScenarioIds: ({ commit }, value) => {
    commit('setSelectedScenarioIds', value);
  }
};


const mutations: MutationTree<ModelPublishState> = {
  setCurrentOutputIndex(state, value) {
    state.currentOutputIndex = value;
  },
  setCurrentPublishStep(state, value) {
    state.currentPublishStep = value;
  },
  setSelectedTemporalAggregation(state, value) {
    state.selectedTemporalAggregation = value;
  },
  setSelectedTemporalResolution(state, value) {
    state.selectedTemporalResolution = value;
  },
  setSelectedSpatialAggregation(state, value) {
    state.selectedSpatialAggregation = value;
  },
  setSelectedTimestamp(state, value) {
    state.selectedTimestamp = value;
  },
  setSelectedScenarioIds(state, value) {
    state.selectedScenarioIds = value;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
