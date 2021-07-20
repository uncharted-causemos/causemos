import { GetterTree, MutationTree, ActionTree } from 'vuex';
import { BASE_LAYER, FIRST_LAYER } from '@/services/map-service';
import { STYLE_URL_PREFIX } from '@/utils/map-util';

const MUTATIONS = {
  SET_SELECTED_BASE_LAYER: 'setSelectedBaseLayer',
  SET_SELECTED_FIRST_LAYER: 'SetSelectedFirstLayer'
};

interface MapState {
  selectedBaseLayer: BASE_LAYER;
  selectedFirstLayer: FIRST_LAYER;
}

const state: MapState = {
  selectedBaseLayer: BASE_LAYER.DEFAULT,
  selectedFirstLayer: FIRST_LAYER.TILES
};

const getters: GetterTree<MapState, any> = {
  selectedBaseLayer: state => state.selectedBaseLayer,
  selectedBaseLayerEndpoint: state => `${STYLE_URL_PREFIX}${state.selectedBaseLayer}`,
  selectedFirstLayer: state => state.selectedFirstLayer
};

const actions: ActionTree<MapState, any> = {
  setSelectedBaseLayer({ commit }, baseLayer) {
    commit(MUTATIONS.SET_SELECTED_BASE_LAYER, baseLayer);
  },
  setSelectedFirstLayer({ commit }, baseLayer) {
    commit(MUTATIONS.SET_SELECTED_FIRST_LAYER, baseLayer);
  }
};

const mutations: MutationTree<MapState> = {
  [MUTATIONS.SET_SELECTED_BASE_LAYER](state, baseLayer: BASE_LAYER) {
    state.selectedBaseLayer = baseLayer;
  },
  [MUTATIONS.SET_SELECTED_FIRST_LAYER](state, firstLayer: FIRST_LAYER) {
    state.selectedFirstLayer = firstLayer;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
