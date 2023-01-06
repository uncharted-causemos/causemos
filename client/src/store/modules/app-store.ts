import { DEFAULT_APPLICATION_CONFIGURATION } from '@/services/composables/useApplicationConfiguration';
import { ApplicationConfiguration } from '@/types/ApplicationConfiguration';
import _ from 'lodash';
import { GetterTree, MutationTree, ActionTree } from 'vuex';

interface AppState {
  overlayActivated: boolean;
  overlayMessage: string;
  overlayMessageSecondary: string;
  overlayCancelFn: Function | null;
  updateToken: string;
  ontologyConcepts: Array<string>;
  ontologySet: Set<string>;
  projectMetadata: any; // domain project or analysis project
  analysisName: string;
  datacubeCurrentOutputsMap: {}; // map for datacubes' currently selected features; each key is the datacube-id and the value is the selected output's index
  applicationConfiguration: ApplicationConfiguration;
}

const state: AppState = {
  overlayActivated: false,
  overlayMessage: 'Loading...',
  overlayMessageSecondary: 'Loading...',
  overlayCancelFn: null,
  updateToken: '',
  ontologyConcepts: [],
  ontologySet: new Set<string>(),
  projectMetadata: {},
  analysisName: '',
  datacubeCurrentOutputsMap: {},
  applicationConfiguration: DEFAULT_APPLICATION_CONFIGURATION,
};

const getters: GetterTree<AppState, any> = {
  projectType: (state, getters, rootState /*, rootGetters */) => {
    return rootState.route.params.projectType || null;
  },
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
  datacubeId: (state, getters, rootState) => {
    return rootState.route.params.datacubeId || null;
  },
  indicatorId: (state, getters, rootState) => {
    return rootState.route.params.indicatorId || null;
  },
  nodeId: (state, getters, rootState) => {
    return rootState.route.params.nodeId || null;
  },
  overlayActivated: (state) => state.overlayActivated,
  overlayMessage: (state) => state.overlayMessage,
  overlayMessageSecondary: (state) => state.overlayMessageSecondary,
  overlayCancelFn: (state) => state.overlayCancelFn,
  updateToken: (state) => state.updateToken,
  ontologyConcepts: (state) => state.ontologyConcepts,
  ontologySet: (state) => state.ontologySet,
  projectMetadata: (state) => state.projectMetadata,
  analysisName: (state) => state.analysisName,
  datacubeCurrentOutputsMap: (state) => state.datacubeCurrentOutputsMap,
  applicationConfiguration: (state) => state.applicationConfiguration,
};

type MsgCancel = {
  message: string;
  cancelFn: Function;
};
const actions: ActionTree<AppState, any> = {
  enableOverlayWithCancel({ commit }, payload: MsgCancel) {
    commit('enableOverlay', payload.message);
    if (payload.cancelFn) {
      commit('setOverlayCancelFn', payload.cancelFn);
    }
  },
  enableOverlay({ commit }, message) {
    commit('enableOverlay', message);
  },
  setOverlaySecondaryMessage({ commit }, message) {
    commit('setOverlaySecondaryMessage', message);
  },
  disableOverlay({ commit }) {
    commit('disableOverlay');
    commit('setOverlayCancelFn', null);
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
  setAnalysisName({ commit }, newName) {
    commit('setAnalysisName', newName);
  },
  updateOntologyCache: ({ commit }, v) => {
    commit('updateOntologyCache', v);
  },
  setDatacubeCurrentOutputsMap: ({ commit }, value) => {
    commit('setDatacubeCurrentOutputsMap', value);
  },
  setApplicationConfiguration: ({ commit }, value) => {
    commit('setApplicationConfiguration', value);
  },
};

const mutations: MutationTree<AppState> = {
  enableOverlay(state, message) {
    state.overlayMessage = message;
    state.overlayActivated = true;
  },
  disableOverlay(state) {
    state.overlayActivated = false;
    state.overlayMessageSecondary = '';
  },
  setOverlayCancelFn(state, fn) {
    state.overlayCancelFn = fn;
  },
  setOverlaySecondaryMessage(state, message) {
    state.overlayMessageSecondary = message;
  },
  setUpdateToken(state, updateToken) {
    state.updateToken = updateToken;
  },
  setOntologyConcepts(state, concepts: string[]) {
    state.ontologyConcepts = concepts;

    const shortform = concepts.map((d) => _.last(d.split('/')) || '');
    state.ontologySet = new Set<string>(shortform);
  },
  setProjectMetadata(state, metadata) {
    state.projectMetadata = metadata;
  },
  setAnalysisName(state, newName) {
    state.analysisName = newName;
  },
  updateOntologyCache(state, v) {
    state.ontologyConcepts.push(v);
    state.ontologySet.add(v);
  },
  setDatacubeCurrentOutputsMap(state, value) {
    state.datacubeCurrentOutputsMap = value;
  },
  setApplicationConfiguration(state, value) {
    state.applicationConfiguration = value;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
