import { GetterTree, MutationTree, ActionTree } from 'vuex';
import Shepherd from 'shepherd.js';

/* Used for drilldown-related states */
interface TourState {
  tour: Shepherd.Tour | null;
  isReadyForNextStep: boolean;
}

const state: TourState = {
  tour: null,
  isReadyForNextStep: false,
};

const getters: GetterTree<TourState, any> = {
  tour: (state) => state.tour,
  isReadyForNextStep: (state) => state.isReadyForNextStep,
};

const actions: ActionTree<TourState, any> = {
  setTour: ({ commit }, newValue) => {
    commit('setTour', newValue);
  },
  enableNextStep: ({ commit }) => {
    commit('enableNextStep');
  },
};

const mutations: MutationTree<TourState> = {
  enableNextStep(state) {
    state.isReadyForNextStep = true;
  },
  setTour(state, value) {
    state.tour = value;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
