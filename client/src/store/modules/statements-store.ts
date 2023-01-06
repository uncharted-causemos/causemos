import _ from 'lodash';
import { GetterTree, MutationTree, ActionTree } from 'vuex';
import CodeUtil from '@/utils/code-util';

const FIELDS = CodeUtil.FIELDS;

interface ColumnState {
  id: string;
  visible: boolean;
  group?: string;
}

interface StatementViewState {
  columns: ColumnState[];
}

/**
 * Tracks internal states of the statements table, that
 * are unrelated to the global or URL states.
 */
const state: StatementViewState = {
  columns: [
    { id: FIELDS.YEAR, visible: true, group: 'context' },
    { id: FIELDS.GEO_LOCATION_NAME, visible: true, group: 'context' },

    { id: FIELDS.SUBJ_ADJECTIVES, visible: true, group: 'subj' },
    { id: FIELDS.SUBJ, visible: true, group: 'subj' },
    { id: FIELDS.SUBJ_CONCEPT, visible: true, group: 'subj' },
    { id: FIELDS.SUBJ_CONCEPT_SCORE, visible: true, group: 'subj' },

    { id: FIELDS.SUBJ_POLARITY, visible: true, group: 'subj' },

    { id: FIELDS.TYPE, visible: false, group: 'relation' },
    { id: FIELDS.STATEMENT_POLARITY, visible: true, group: 'relation' },
    { id: FIELDS.BELIEF, visible: true, group: 'relation' },

    { id: FIELDS.OBJ_ADJECTIVES, visible: true, group: 'obj' },
    { id: FIELDS.OBJ, visible: true, group: 'obj' },
    { id: FIELDS.OBJ_CONCEPT, visible: true, group: 'obj' },
    { id: FIELDS.OBJ_CONCEPT_SCORE, visible: true, group: 'obj' },

    { id: FIELDS.OBJ_POLARITY, visible: true, group: 'obj' },

    { id: FIELDS.SENTENCES, visible: true, group: 'evidence' },
    { id: FIELDS.NUM_EVIDENCES, visible: true, group: 'evidence' },
    { id: FIELDS.READERS, visible: false },
  ],
};

const getters: GetterTree<StatementViewState, any> = {
  columns: (state) => state.columns,
  visibleColumns: (state) => {
    return _.chain(state.columns).keyBy('id').mapValues('visible').value();
  },
  numSubjVisible: (state) => {
    return state.columns.filter((d) => d.group === 'subj' && d.visible === true).length;
  },
  numObjVisible: (state) => {
    return state.columns.filter((d) => d.group === 'obj' && d.visible === true).length;
  },
  numRelVisible: (state) => {
    return state.columns.filter((d) => d.group === 'relation' && d.visible === true).length;
  },
  numContextVisible: (state) => {
    return state.columns.filter((d) => d.group === 'context' && d.visible === true).length;
  },
  numEvidenceVisible: (state) => {
    return state.columns.filter((d) => d.group === 'evidence' && d.visible === true).length;
  },
};

const actions: ActionTree<StatementViewState, any> = {
  toggleColumn({ commit }, idx) {
    commit('toggleColumn', idx);
  },
};

const mutations: MutationTree<StatementViewState> = {
  toggleColumn(state, idx) {
    const columnsClone = _.cloneDeep(state.columns);
    columnsClone[idx].visible = !columnsClone[idx].visible;
    state.columns = columnsClone;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
