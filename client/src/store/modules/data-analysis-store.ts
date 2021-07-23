import _ from 'lodash';
import { GetterTree, MutationTree, ActionTree } from 'vuex';
import { getAnalysisState, saveAnalysisState } from '@/services/analysis-service';
import API from '@/api/api';
import router from '@/router';
import { Datacube } from '@/types/Datacubes';
import { ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';

type MapBounds = [[number, number], [number, number]];

interface AnalysisItemFilter {
  range: { min: number; max: number };
  global: boolean;
}
interface RunOutputSelection {
  runId: string;
  timestamp: number;
}
// Defines the preservable analysis item states
interface AnalysisItemState {
  id: string;
  datacubeId: string;
  modelId: string;
  outputVariable: string;
  selection?: RunOutputSelection;
  filter?: AnalysisItemFilter[];
}
interface AnalysisItem extends AnalysisItemState {
  model: string;
  source: string;
  units: string;
  outputDescription: string;
}

interface AnalysisItemNew {
  id: string;
  datacubeId: string;
}

interface AlgebraciTransform {
  name?: string;
  maxInputCount?: number;
}
interface AnalysisState {
  currentAnalysisId: string;
  analysisItems: AnalysisItem[];
  timeSelectionSyncing: boolean;
  mapBounds: MapBounds;
  algebraicTransform: AlgebraciTransform;
  algebraicTransformInputIds: string[];
}

/**
  * Create a new data analysis item
  *
  * @param {String} datacubeID
  * @param {String} modelId
  * @param {String} outputVariable
  *
  * @returns {AnalysisItem}
  */
const createNewAnalysisItem = (datacubeId: string, modelId: string, outputVariable: string, source: string, units: string, outputDescription: string, model: string): AnalysisItem => {
  return {
    id: datacubeId,
    datacubeId,
    modelId,
    outputVariable,
    filter: undefined,
    selection: undefined,
    model,
    source,
    units,
    outputDescription
  };
};

const createNewAnalysisItemNew = (datacubeInfo: {
    id: string;
    datacubeId: string;
}): AnalysisItemNew => {
  return datacubeInfo;
};

/**
 * Return new analysis items where data portion of each item of given analysis item list is trimmed off
 */
const toAnalysisItemStates = (analysisItems: AnalysisItem[] = []): AnalysisItemState[] => {
  return analysisItems.map(item => {
    return {
      id: item.id,
      datacubeId: item.datacubeId,
      modelId: item.modelId,
      outputVariable: item.outputVariable,
      selection: item.selection,
      filter: item.filter
    };
  });
};

const loadFromAnalysisItemsState = async (analysisItems: AnalysisItem[] = []): Promise<AnalysisItem[]> => {
  const datacubeIds = analysisItems.filter(item => !!item.datacubeId).map(item => item.datacubeId);
  if (datacubeIds.length === 0) return [];
  const filter = { clauses: [{ field: 'id', operand: 'or', isNot: false, values: datacubeIds }] };
  // TODO: Define datacube interface in somewhere
  const { data }: { data: Datacube[]} = await API.get(`maas/datacubes?filters=${JSON.stringify(filter)}`);
  return analysisItems.map(item => {
    const datacube = data.find(d => d.id === item.datacubeId);
    if (!datacube) return item;
    const { model, output_units: units, source, output_description: outputDescription } = datacube;
    return { ...item, model, source, units, outputDescription };
  });
};

const saveState = _.debounce((state: AnalysisState) => {
  // FIXME: Vue3 A bit hacky, might be a better way
  const analysisId = router.currentRoute.value.params.analysisId;
  if (!analysisId) return; // Current route doesn't support saving analysis state. Just return.
  const { analysisItems, timeSelectionSyncing, mapBounds } = state;
  saveAnalysisState(state.currentAnalysisId, {
    analysisItems: toAnalysisItemStates(analysisItems),
    timeSelectionSyncing,
    mapBounds
  });
}, 500);

const saveStateNew = _.debounce((state: AnalysisState) => {
  // FIXME: Vue3 A bit hacky, might be a better way
  const analysisId = state.currentAnalysisId; // router.currentRoute.value.params.analysisId;
  if (!analysisId) return; // Current route doesn't support saving analysis state. Just return.
  const { analysisItems, timeSelectionSyncing, mapBounds } = state;
  saveAnalysisState(state.currentAnalysisId, {
    analysisItems: analysisItems,
    timeSelectionSyncing,
    mapBounds
  });
}, 500);

const ensureAlgebraicInputsArePresent = (inputIds: string[], analysisItems: AnalysisItem[]) => {
  // Return a new array of input IDs, after filtering out any IDs
  //  that don't have a corresponding analysisItem anymore.
  return inputIds.filter(inputId => {
    return analysisItems.find(item => item.id === inputId) !== undefined;
  });
};

// Default state for state that can be saved/loaded
const DEFAULT_STATE: AnalysisState = {
  currentAnalysisId: '',
  analysisItems: [],
  timeSelectionSyncing: false,
  mapBounds: [ // Default bounds to Ethiopia
    [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
    [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
  ],
  algebraicTransform: {},
  algebraicTransformInputIds: []
};

const state = { ...DEFAULT_STATE };

const getters: GetterTree<AnalysisState, any> = {
  analysisItems: state => state.analysisItems,
  timeSelectionSyncing: state => state.timeSelectionSyncing,
  mapBounds: state => state.mapBounds,
  analysisId: state => state.currentAnalysisId,
  algebraicTransform: state => state.algebraicTransform,
  algebraicTransformInputIds: state => state.algebraicTransformInputIds
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
    newState.analysisItems = await loadFromAnalysisItemsState(newState.analysisItems);
    commit('loadState', { analysisId, payload: newState });
  },
  async loadStateNew({ state, commit }, analysisId: string) {
    // loadState is called as a route guard on the DataView and DataExplorer pages.
    //  the analysisId is stored to avoid fetching its state if it has already been fetched,
    //  and to avoid duplicating shared fetch/state logic.
    if (!analysisId) return;
    // if the store is already loaded with the state of the analysis of currentAnalysisId, return.
    if (state.currentAnalysisId === analysisId) return;
    const newState = await getAnalysisState(analysisId);
    commit('loadStateNew', { analysisId, payload: newState });
  },
  async updateAnalysisItems({ state, commit }, datacubeIDs: string[]) {
    const datacubes = [];
    if (!_.isEmpty(datacubeIDs)) {
      // Fetch datacubes metadata
      const filter = { clauses: [{ field: 'id', operand: 'or', isNot: false, values: datacubeIDs }] };
      const { data } = await API.get(`maas/datacubes?filters=${JSON.stringify(filter)}`);
      datacubes.push(...data);
    }
    const analysisItems = datacubes.map(datacube => {
      const { id, model, model_id: modelId, output_name: outputName, output_units: units, source, output_description: outputDescription } = datacube;
      const analysisItem = state.analysisItems.find(item => item.id === id);
      // Note: old data use model name as model Id and new data (supermaas) has dedicated modelId field
      const mid = modelId || model;
      return analysisItem !== undefined
        ? analysisItem // Preserve existing item
        : createNewAnalysisItem(id, mid, outputName, source, units, outputDescription, model);
    });
    // Remove any algebraic input IDs whose matching analysis item has also been removed
    const newInputIds = ensureAlgebraicInputsArePresent(state.algebraicTransformInputIds, analysisItems);
    commit('setAlgebraicTransformInputIds', newInputIds);
    commit('setAnalysisItems', analysisItems);
  },
  async updateAnalysisItemsNew({ state, commit }, { currentAnalysisId, datacubeIDs }: { currentAnalysisId: string; datacubeIDs: AnalysisItemNew[] }) {
    state.currentAnalysisId = currentAnalysisId;
    const analysisItems = datacubeIDs.map(datacubeId => {
      const analysisItem = state.analysisItems.find(item => item.id === datacubeId.id);
      return analysisItem !== undefined
        ? analysisItem // Preserve existing item
        : createNewAnalysisItemNew(datacubeId);
    });
    commit('setAnalysisItemsNew', analysisItems);
  },
  async updateAnalysisItemsNewPreview({ state, commit }, { datacubeIDs }: { datacubeIDs: AnalysisItemNew[] }) {
    const analysisItems = datacubeIDs.map(datacubeId => {
      const analysisItem = state.analysisItems.find(item => item.id === datacubeId.id);
      return analysisItem !== undefined
        ? analysisItem // Preserve existing item
        : createNewAnalysisItemNew(datacubeId);
    });
    commit('setAnalysisItemsNewPreview', analysisItems);
  },
  setMapBounds({ commit }, bounds: [[number, number], [number, number]]) {
    commit('setMapBounds', bounds);
  },
  updateFilter({ state, commit }, { analysisItemId, filter }: { analysisItemId: string; filter: AnalysisItemFilter[] }) {
    const item = state.analysisItems.find(({ id }) => id === analysisItemId);
    if (!item) return;
    item.filter = Object.assign({}, item.filter, filter);
    commit('setAnalysisItems', state.analysisItems);
  },
  removeFilter({ state, commit }, analysisItemId: string) {
    const item = state.analysisItems.find(({ id }) => id === analysisItemId);
    if (!item) return;
    item.filter = undefined;
    commit('setAnalysisItems', state.analysisItems);
  },
  updateSelection({ state, commit }, { analysisItemId, selection }: { analysisItemId: string; selection: RunOutputSelection }) {
    if (!analysisItemId) return;
    const base = {
      runId: undefined,
      timestamp: undefined
    };
    const item = state.analysisItems.find(item => analysisItemId === item.id);
    if (!item) return;
    item.selection = Object.assign(base, item.selection, selection);
    commit('setAnalysisItems', state.analysisItems);
  },
  updateAllTimeSelection({ state, commit }, timestamp: number) {
    const items = state.analysisItems.map(item => {
      if (!item.selection) return item;
      item.selection = { ...item.selection, timestamp };
      return item;
    });
    commit('setAnalysisItems', items);
  },
  setTimeSelectionSyncing({ commit }, bool: boolean) {
    commit('setTimeSelectionSyncing', bool);
  },
  removeAnalysisItems({ state, commit }, analysisItemIds: string[] = []) {
    const items = state.analysisItems.filter(item => !analysisItemIds.includes(item.id));
    commit('setAnalysisItems', items);
  },
  setAlgebraicTransform({ state, commit }, transform: AlgebraciTransform) {
    if (transform === null) {
      commit('setAlgebraicTransformInputIds', []);
    } else if (transform.maxInputCount !== null) {
      // Deselect any data cubes beyond the number that the transform supports
      const newInputs = state.algebraicTransformInputIds.slice(0, transform.maxInputCount);
      commit('setAlgebraicTransformInputIds', newInputs);
    }
    commit('setAlgebraicTransform', transform);
  },
  toggleAlgebraicTransformInput({ state, commit }, dataCubeId: string) {
    let dataCubeWasSelected = false;
    const newInputIds = state.algebraicTransformInputIds.filter(inputId => {
      // Remove data cube if it's in the list of selected inputIds
      if (inputId === dataCubeId) {
        dataCubeWasSelected = true;
        return false;
      }
      return true;
    });
    if (!dataCubeWasSelected) {
      newInputIds.push(dataCubeId);
    }
    commit('setAlgebraicTransformInputIds', newInputIds);
  },
  removeAlgebraicTransformInput({ commit, state }, id: string) {
    const newInputIds = state.algebraicTransformInputIds.filter(inputId => inputId !== id);
    commit('setAlgebraicTransformInputIds', newInputIds);
  },
  swapAlgebraicTransformInputs({ commit, state }) {
    if (state.algebraicTransformInputIds.length !== 2) return;
    const newInputIds = [
      state.algebraicTransformInputIds[1],
      state.algebraicTransformInputIds[0]
    ];
    commit('setAlgebraicTransformInputIds', newInputIds);
  }
};

const mutations: MutationTree<AnalysisState> = {
  loadState(state, { analysisId, payload }: { analysisId: string; payload: AnalysisItem}) {
    Object.assign(state, DEFAULT_STATE, payload);
    state.currentAnalysisId = analysisId;
  },
  loadStateNew(state, { analysisId, payload }: { analysisId: string; payload: AnalysisItemNew}) {
    Object.assign(state, DEFAULT_STATE, payload);
    state.currentAnalysisId = analysisId;
  },
  setAnalysisItems(state, items = []) {
    state.analysisItems = items;
    saveState(state);
  },
  setAnalysisItemsNew(state, items = []) {
    state.analysisItems = items;
    saveStateNew(state);
  },
  setAnalysisItemsNewPreview(state, items = []) {
    state.analysisItems = items;
  },
  setMapBounds(state, bounds: MapBounds) {
    state.mapBounds = bounds;
    saveState(state);
  },
  setTimeSelectionSyncing(state, bool = false) {
    state.timeSelectionSyncing = bool;
    saveState(state);
  },
  setAlgebraicTransform(state, transform: AlgebraciTransform) {
    state.algebraicTransform = transform;
  },
  setAlgebraicTransformInputIds(state, inputIds: string[]) {
    state.algebraicTransformInputIds = inputIds;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
