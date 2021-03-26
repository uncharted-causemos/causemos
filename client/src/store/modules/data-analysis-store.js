import _ from 'lodash';
import { getAnalysisState, saveAnalysisState } from '@/services/analysis-service';
import API from '@/api/api';
import router from '@/router';
import { ETHIOPIA_BOUNDING_BOX } from '@/utils/geo-util';

/**
 * A filter object for the analysis item.
 * @typedef {Object} AnalysisItemFilter
 * @property {Object} range - A range filter object
 * @property {number} range.min - Minimum value
 * @property {number} range.max - Maximum value
 * @property {boolean} global - true if filter is global
 */

/**
 * A model run selection object for the analysis item.
 * @typedef {Object} AnalysisItemSelection
 * @property {string} runId - Model run id
 * @property {number} timestamp - Timestamp
 */

/**
 * A data analysis item
 * @typedef {Object} AnalysisItem
 * @property {string} id - Analysis item id
 * @property {string} datacubeId - Datacube id
 * @property {string} modelId - Model ID
 * @property {string} outputVariable - Model output variable name
 * @property {AnalysisItemFilter} filter - A filter object
 * @property {AnalysisItemSelection} selection - A selection object
 */

// List of analysis item state field name that needs to be preserved
const ANALYSIS_ITEM_STATE_FIELDS = Object.freeze({
  id: 'id',
  datacubeId: 'datacubeId',
  modelId: 'modelId',
  outputVariable: 'outputVariable',
  filter: 'filter',
  selection: 'selection'
});

/**
  * Create a new data analysis item
  *
  * @param {String} datacubeID
  * @param {String} modelId
  * @param {String} outputVariable
  *
  * @returns {AnalysisItem}
  */
const createNewAnalysisItem = (datacubeID, modelId, outputVariable, source, units, outputDescription, model) => {
  return {
    [ANALYSIS_ITEM_STATE_FIELDS.id]: datacubeID, // for now, use datacube id as analysis item id
    [ANALYSIS_ITEM_STATE_FIELDS.datacubeId]: datacubeID,
    [ANALYSIS_ITEM_STATE_FIELDS.modelId]: modelId,
    [ANALYSIS_ITEM_STATE_FIELDS.outputVariable]: outputVariable,
    [ANALYSIS_ITEM_STATE_FIELDS.filter]: undefined,
    [ANALYSIS_ITEM_STATE_FIELDS.selection]: undefined,
    model: model,
    source: source || 'No source provided',
    units: units || 'No units provided',
    outputDescription: outputDescription
  };
};

/**
 * Return new analysis items where data portion of each item of given analysis item list is trimmed off
 * @param {AnalysisItem[]} analysisItems A list of analysis items
 * @returns {AnalysisItem[]}
 */
const toAnalysisItemsState = (analysisItems = []) => {
  const stateFields = Object.values(ANALYSIS_ITEM_STATE_FIELDS);
  return analysisItems.map(item => {
    const state = _.pickBy(item, (value, key) => stateFields.includes(key));
    return state;
  });
};

/**
 * Load data to given analysis items and return them as new array
 * @param {AnalysisItem[]} analysisItems A list of analysis items
 * @returns {AnalysisItem[]}
 */
const loadFromAnalysisItemsState = async (analysisItems = []) => {
  const datacubeIds = analysisItems.filter(item => !!item.datacubeId).map(item => item.datacubeId);
  if (datacubeIds.length === 0) return [];
  const filter = { clauses: [{ field: 'id', operand: 'or', isNot: false, values: datacubeIds }] };
  const { data } = await API.get(`maas/datacubes?filters=${JSON.stringify(filter)}`);
  return analysisItems.map(item => {
    const datacube = data.find(d => d.id === item.datacubeId);
    const { model, output_units: units, source, output_description: outputDescription } = datacube;
    return { ...item, model, source, units, outputDescription };
  });
};

const saveState = _.debounce((state) => {
  // FIXME: Vue3 A bit hacky, might be a better way
  const analysisID = router.currentRoute.value.params.analysisID;
  if (!analysisID) return; // Current route doesn't support saving analysis state. Just return.
  const { analysisItems, timeSelectionSyncing, mapBounds } = state;
  saveAnalysisState(state.currentAnalysisId, {
    analysisItems: toAnalysisItemsState(analysisItems),
    timeSelectionSyncing,
    mapBounds
  });
}, 500);

const ensureAlgebraicInputsArePresent = (inputIds, analysisItems) => {
  // Return a new array of input IDs, after filtering out any IDs
  //  that don't have a corresponding analysisItem anymore.
  return inputIds.filter(inputId => {
    return analysisItems.find(item => item.id === inputId) !== undefined;
  });
};

// Default state for state that can be saved/loaded
const DEFAULT_STATE = {
  /** @type {AnalysisItem[]} */
  analysisItems: [],
  timeSelectionSyncing: false,
  mapBounds: [ // Default bounds to Ethiopia
    [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
    [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
  ],
  algebraicTransform: null,
  algebraicTransformInputIds: []
};

export default {
  namespaced: true,
  state: {
    currentAnalysisId: undefined,
    ...DEFAULT_STATE
  },
  getters: {
    analysisItems: state => state.analysisItems,
    timeSelectionSyncing: state => state.timeSelectionSyncing,
    mapBounds: state => state.mapBounds,
    analysisId: state => state.currentAnalysisId,
    algebraicTransform: state => state.algebraicTransform,
    algebraicTransformInputIds: state => state.algebraicTransformInputIds
  },
  actions: {
    async loadState({ state, commit }, analysisID) {
      // loadState is called as a route guard on the DataView and DataExplorer pages.
      //  the analysisID is stored to avoid fetching its state if it has already been fetched,
      //  and to avoid duplicating shared fetch/state logic.
      if (!analysisID) return;
      // if the store is already loaded with the state of the analysis of currentAnalysisId, return.
      if (state.currentAnalysisId === analysisID) return;
      const newState = await getAnalysisState(analysisID);
      newState.analysisItems = await loadFromAnalysisItemsState(newState.analysisItems);
      commit('loadState', { analysisID, payload: newState });
    },
    async updateAnalysisItems({ state, commit }, datacubeIDs) {
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
    setMapBounds({ commit }, bounds) {
      commit('setMapBounds', bounds);
    },
    updateFilter({ state, commit }, { analysisItemId, filter }) {
      const item = state.analysisItems.find(({ id }) => id === analysisItemId);
      if (!item) return;
      item.filter = Object.assign({}, item.filter, filter);
      commit('setAnalysisItems', state.analysisItems);
    },
    removeFilter({ state, commit }, analysisItemId) {
      const item = state.analysisItems.find(({ id }) => id === analysisItemId);
      item.filter = undefined;
      commit('setAnalysisItems', state.analysisItems);
    },
    updateSelection({ state, commit }, { analysisItemId, selection }) {
      if (!analysisItemId) return;
      const base = {
        runId: undefined,
        timestamp: undefined
      };
      const item = state.analysisItems.find(item => analysisItemId === item.id);
      item.selection = Object.assign(base, item.selection, selection);
      commit('setAnalysisItems', state.analysisItems);
    },
    updateAllTimeSelection({ state, commit }, timestamp) {
      const items = state.analysisItems.map(item => {
        item.selection = { ...item.selection, timestamp };
        return item;
      });
      commit('setAnalysisItems', items);
    },
    setTimeSelectionSyncing({ commit }, bool) {
      commit('setTimeSelectionSyncing', bool);
    },
    removeAnalysisItems({ state, commit }, analysisItemIds = []) {
      const items = state.analysisItems.filter(item => !analysisItemIds.includes(item.id));
      commit('setAnalysisItems', items);
    },
    setAlgebraicTransform({ state, commit }, transform) {
      if (transform === null) {
        commit('setAlgebraicTransformInputIds', []);
      } else if (transform.maxInputCount !== null) {
        // Deselect any data cubes beyond the number that the transform supports
        const newInputs = state.algebraicTransformInputIds.slice(0, transform.maxInputCount);
        commit('setAlgebraicTransformInputIds', newInputs);
      }
      commit('setAlgebraicTransform', transform);
    },
    toggleAlgebraicTransformInput({ state, commit }, dataCubeId) {
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
    removeAlgebraicTransformInput({ commit, state }, id) {
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
  },
  mutations: {
    loadState(state, { analysisID, payload }) {
      state.currentAnalysisId = analysisID;
      Object.assign(state, DEFAULT_STATE, payload);
    },
    setAnalysisItems(state, items = []) {
      state.analysisItems = items;
      saveState(state);
    },
    setMapBounds(state, bounds) {
      state.mapBounds = bounds;
      saveState(state);
    },
    setTimeSelectionSyncing(state, bool = false) {
      state.timeSelectionSyncing = bool;
      saveState(state);
    },
    setAlgebraicTransform(state, transform) {
      state.algebraicTransform = transform;
    },
    setAlgebraicTransformInputIds(state, inputIds) {
      state.algebraicTransformInputIds = inputIds;
    }
  }
};
