import _ from 'lodash';
import { GetterTree, MutationTree, ActionTree } from 'vuex';
import { getAnalysisState, saveAnalysisState } from '@/services/analysis-service';
import { AnalysisItem, AnalysisState } from '@/types/Analysis';

const saveState = _.debounce((state: AnalysisState) => {
  // FIXME: Vue3 A bit hacky, might be a better way
  const analysisId = state.currentAnalysisId; // router.currentRoute.value.params.analysisId;
  if (!analysisId) return; // Current route doesn't support saving analysis state. Just return.
  const { analysisItems } = state;
  saveAnalysisState(state.currentAnalysisId, {
    analysisItems: analysisItems
  });
}, 500);

// Default state for state that can be saved/loaded
const DEFAULT_STATE: AnalysisState = {
  currentAnalysisId: '',
  selectedAnalysisId: '',
  analysisItems: [],
  timeSelectionSyncing: false
};

const state = { ...DEFAULT_STATE };

const getters: GetterTree<AnalysisState, any> = {
  analysisItems: state => state.analysisItems,
  analysisId: state => state.currentAnalysisId,
  selectedItem: state => state.analysisItems.find(item => item.id === state.selectedAnalysisId),
  timeSelectionSyncing: state => state.timeSelectionSyncing
};

const actions: ActionTree<AnalysisState, any> = {
  async loadState({ state, commit }, analysisId: string) {
    // loadState is called as a route guard on the DataView and DataExplorer pages.
    //  the analysisId is stored to avoid fetching its state if it has already been fetched,
    //  and to avoid duplicating shared fetch/state logic.
    if (!analysisId) return;
    // if the store is already loaded with the state of the analysis of currentAnalysisId, return.
    if (state.currentAnalysisId === analysisId) return;
    const newState = await getAnalysisState(analysisId);
    commit('loadState', { analysisId, payload: newState });
  },
  async updateAnalysisItems({ state, commit }, { currentAnalysisId, analysisItems }: { currentAnalysisId: string; analysisItems: AnalysisItem[] }) {
    state.currentAnalysisId = currentAnalysisId;
    const updatedAnalysisItems = analysisItems;
    commit('setAnalysisItems', updatedAnalysisItems);
  },
  async updateAnalysisItemsPreview({ commit }, { datacubeIDs }: { datacubeIDs: string[]}) {
    const updatedAnalysisItems = [{
      id: datacubeIDs[0]
    }];
    // only one datacube is being previewed here, so store its 'id' as the analysisItem detail
    commit('setAnalysisItemsPreview', updatedAnalysisItems);
  },
  removeAnalysisItems({ state, commit }, analysisItemIds: string[] = []) {
    const items = state.analysisItems.filter(item => !analysisItemIds.includes(item.id));
    commit('setAnalysisItems', items);
  },
  setSelectedAnalysisId({ state, commit }, newId: string) {
    commit('setSelectedItemId', newId);
  },
  setTimeSelectionSyncing({ commit }, newValue: boolean) {
    commit('setTimeSelectionSyncing', newValue);
  }
};

const mutations: MutationTree<AnalysisState> = {
  loadState(state, { analysisId, payload }: { analysisId: string; payload: AnalysisItem}) {
    Object.assign(state, DEFAULT_STATE, payload);
    state.currentAnalysisId = analysisId;
  },
  setSelectedItemId(state, analysisId) {
    state.selectedAnalysisId = analysisId;
  },
  setAnalysisItems(state, items = []) {
    state.analysisItems = items;
    saveState(state);
  },
  setAnalysisItemsPreview(state, items = []) {
    state.analysisItems = items;
  },
  setTimeSelectionSyncing(state, newValue: boolean) {
    state.timeSelectionSyncing = newValue;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
