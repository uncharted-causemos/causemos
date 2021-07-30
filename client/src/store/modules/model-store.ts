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
  setDraftScenario({ commit }, draft) {
    commit('setDraftScenario', draft);
  },
  updateDraftScenarioConstraints({ commit }, c: ConceptProjectionConstraints) {
    commit('updateDraftScenarioConstraints', c);
  },
  setDraftScenarioDirty({ commit }, v) {
    commit('setDraftScenarioDirty', v);
  }
};

const mutations: MutationTree<ModelState> = {
  setSelectedScenarioId(state, id) {
    state.selectedScenarioId = id;
  },
  setDraftScenario(state, draft) {
    state.draftScenario = draft;
    if (state.draftScenario !== null) {
      state.draftScenarioDirty = true;
    } else {
      state.draftScenarioDirty = false;
    }
  },
  updateDraftScenarioConstraints(state, newCPC: ConceptProjectionConstraints) {
    if (state.draftScenario && state.draftScenario.parameter) {
      const constraints = state.draftScenario.parameter?.constraints;
      if (!constraints || constraints.length === 0) {
        state.draftScenario.parameter.constraints = [newCPC];
      } else {
        const cpc = constraints.find(c => c.concept === newCPC.concept);
        if (!cpc) {
          constraints.push(newCPC);
        } else {
          cpc.values = newCPC.values;
        }
      }
    }
  },
  setDraftScenarioDirty(state, v) {
    state.draftScenarioDirty = v;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
