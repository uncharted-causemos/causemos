import { GetterTree, MutationTree, ActionTree } from 'vuex';
import { BASE_LAYER, DATA_LAYER } from '@/utils/map-util-new';
import { STYLE_URL_PREFIX } from '@/utils/map-util';

const MUTATIONS = {
  SET_SELECTED_BASE_LAYER: 'setSelectedBaseLayer',
  SET_SELECTED_FIRST_LAYER: 'SetSelectedDataLayer'
};

interface MapState {
  selectedBaseLayer: BASE_LAYER;
  selectedDataLayer: DATA_LAYER;
}

const state: MapState = {
  selectedBaseLayer: BASE_LAYER.DEFAULT,
  selectedDataLayer: DATA_LAYER.ADMIN
};

const getters: GetterTree<MapState, any> = {
  selectedBaseLayer: state => state.selectedBaseLayer,
  selectedBaseLayerEndpoint: state => `${STYLE_URL_PREFIX}${state.selectedBaseLayer}`,
  selectedDataLayer: state => state.selectedDataLayer
};

const actions: ActionTree<MapState, any> = {
  setSelectedBaseLayer({ commit }, baseLayer) {
    commit(MUTATIONS.SET_SELECTED_BASE_LAYER, baseLayer);
  },
  setSelectedDataLayer({ commit }, baseLayer) {
    commit(MUTATIONS.SET_SELECTED_FIRST_LAYER, baseLayer);
  }
};

const mutations: MutationTree<MapState> = {
  [MUTATIONS.SET_SELECTED_BASE_LAYER](state, baseLayer: BASE_LAYER) {
    state.selectedBaseLayer = baseLayer;
  },
  [MUTATIONS.SET_SELECTED_FIRST_LAYER](state, firstLayer: DATA_LAYER) {
    state.selectedDataLayer = firstLayer;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
