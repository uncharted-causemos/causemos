import _ from 'lodash';
import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface AppState {
  overlayActivated: boolean;
  overlayMessage: string;
  updateToken: string;
  ontologyConcepts: Array<string>;
  ontologySet: Set<string>;
  projectMetadata: any; // FIXME
  conceptDefinitions: { [key: string]: string };
}

const state: AppState = {
  overlayActivated: false,
  overlayMessage: 'Loading...',
  updateToken: '',
  ontologyConcepts: [],
  ontologySet: new Set<string>(),
  projectMetadata: {},
  conceptDefinitions: {}
};


const getters: GetterTree<AppState, any> = {
  project: (state, getters, rootState /*, rootGetters */) => {
    return rootState.route.params.project || null;
  },
  currentView: (state, getters, rootState /* , rootGetters */) => {
    const view = rootState.route.name || 'home';
    return view;
  },
  currentCAG: (state, getters, rootState /*, rootGetters */) => {
    return rootState.route.params.currentCAG || null;
  },
  overlayActivated: state => state.overlayActivated,
  overlayMessage: state => state.overlayMessage,
  updateToken: state => state.updateToken,
  ontologyConcepts: state => state.ontologyConcepts,
  ontologySet: state => state.ontologySet,
  projectMetadata: state => state.projectMetadata,
  conceptDefinitions: state => state.conceptDefinitions
};


const actions: ActionTree<AppState, any> = {
  enableOverlay({ commit }, message) {
    commit('enableOverlay', message);
  },
  disableOverlay({ commit }) {
    commit('disableOverlay');
  },
  setUpdateToken({ commit }, updateToken) {
    commit('setUpdateToken', updateToken);
  },
  setOntologyConcepts({ commit }, concepts) {
    commit('setOntologyConcepts', concepts);
  },
  setProjectMetadata({ commit }, metadata) {
    commit('setProjectMetadata', metadata);
  },
  setConceptDefinitions: ({ commit }, examples) => {
    commit('setConceptDefinitions', examples);
  }
};


const mutations: MutationTree<AppState> = {
  enableOverlay(state, message) {
    state.overlayMessage = message;
    state.overlayActivated = true;
  },
  disableOverlay(state) {
    state.overlayActivated = false;
  },
  setUpdateToken(state, updateToken) {
    state.updateToken = updateToken;
  },
  setOntologyConcepts(state, concepts: string[]) {
    state.ontologyConcepts = concepts;

    const shortform = concepts.map(d => _.last(d.split('/')) || '');
    state.ontologySet = new Set<string>(shortform);
  },
  setProjectMetadata(state, metadata) {
    state.projectMetadata = metadata;
  },
  setConceptDefinitions(state, definitions) {
    state.conceptDefinitions = definitions;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
