import { GetterTree, MutationTree, ActionTree } from 'vuex';
import { Scenario, ConceptProjectionConstraints } from '@/types/CAG';

interface ModelState {
  selectedScenarioId: string | null;
  draftScenario: Scenario | null;
  draftScenarioDirty: boolean;
}

const state: ModelState = {
  selectedScenarioId: null,
  draftScenario: null,
  draftScenarioDirty: false
};

const getters: GetterTree<ModelState, any> = {
  selectedModel: (state, getters, rootState /*, rootGetters */) => {
    return rootState.route.params.selectedModel;
  },
  selectedScenarioId: state => state.selectedScenarioId,
  draftScenario: state => state.draftScenario,
  draftScenarioDirty: state => state.draftScenarioDirty
};

const actions: ActionTree<ModelState, any> = {
  setSelectedScenarioId({ commit }, id) {
    commit('setSelectedScenarioId', id);
  },
  newDraftScenario({ commit }, draft) {
    commit('newDraftScenario', draft);
  },
  updateDrafScenariotConstraints({ commit }, c: ConceptProjectionConstraints) {
    commit('updateDrafScenariotConstraints', c);
  }
};

const mutations: MutationTree<ModelState> = {
  setSelectedScenarioId(state, id) {
    state.selectedScenarioId = id;
  },
  newDraftScenario(state, draft) {
    state.draftScenario = draft;
    if (state.draftScenario !== null) {
      state.draftScenarioDirty = true;
    }
  },
  updateDrafScenariotConstraints(state, c: ConceptProjectionConstraints) {
    console.log('update draft constraints');
    if (state.draftScenario && state.draftScenario.parameter) {
      const constraints = state.draftScenario.parameter?.constraints;
      if (!constraints || constraints.length === 0) {
        state.draftScenario.parameter.constraints = [c];
        console.log('......setting up empty constraints', state.draftScenario.parameter);
      } else {
        for (let i = 0; i < constraints.length; i++) {
          const cpc: ConceptProjectionConstraints = constraints[i];
          if (cpc.concept === c.concept) {
            cpc.values = c.values;
            state.draftScenarioDirty = true;
          }
        }
      }
    }
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
