import _ from 'lodash';
import { GetterTree, MutationTree, ActionTree } from 'vuex';
import router from '@/router';
import FiltersUtil from '@/utils/filters-util';
import { Filters } from '@/types/Filters';

type View = 'documents' | 'statements' | 'audits';
const DEFAULT_VIEW: View = 'documents';

interface Pagination {
  from: number;
  size?: number;
  sort?: { [key: string]: string };
}

interface QueryUpdate {
  filters?: Filters;
  view?: View;
  layout?: any; // FIXME
  documents?: Pagination;
  statements?: Pagination;
  audits?: Pagination;
}

interface QueryState {
  lastQuery: Filters;
}

/**
 * Builds a query object withy any of the options available
 */
const updateQuery = (getters: GetterTree<QueryState, any>, updateObj: QueryUpdate) => {
  const _filters = updateObj.filters || getters.filters;
  const _layout = updateObj.layout || getters.layout;
  const _view = updateObj.view || getters.view;
  const _cag = getters.cag;

  const query: any = {
    filters: _filters,
    view: _view,
    layout: _layout,
    documents: Object.assign(
      {},
      getters.documents,
      _.pickBy(updateObj.documents, (v) => !_.isNil(v))
    ),
    statements: Object.assign(
      {},
      getters.statements,
      _.pickBy(updateObj.statements, (v) => !_.isNil(v))
    ),
    audits: Object.assign(
      {},
      getters.audits,
      _.pickBy(updateObj.audits, (v) => !_.isNil(v))
    ),
  };
  if (!_.isEmpty(_cag)) {
    query.cag = _cag;
  }

  return query;
};
const defaultDocumentsQuery = Object.freeze({
  from: 0,
  size: 50,
  sort: {},
});
const defaultStatementsQuery = Object.freeze({
  from: 0,
  size: 50,
  sort: {},
});
const defaultAuditsQuery = Object.freeze({
  from: 0,
  size: 50,
  sort: {},
});
const defaultLayout = Object.freeze({
  layoutOption: 'cose-bilkent',
  hierarchyDepth: 0,
  direction: 'x',
  showLabels: true,
  showEdges: true,
  edgeOpacity: 0.4,
  minimumNodeDepth: 1,
});

const START_ZERO = {
  documents: { from: 0 },
  statements: { from: 0 },
  audits: { from: 0 },
};

/**
 * Handles query manipulation, the state and mutations are via
 * vuex-router-sync, as such only actions and getters are available.
 */
const state: QueryState = {
  lastQuery: FiltersUtil.newFilters(),
};

const getters: GetterTree<QueryState, any> = {
  query: (state, getters, rootState /*, rootGetters */) => {
    return Object.assign(
      {
        statements: Object.assign({}, defaultStatementsQuery),
        documents: Object.assign({}, defaultDocumentsQuery),
        audits: Object.assign({}, defaultAuditsQuery),
      },
      rootState.route.query
    );
  },
  // filters is an object, if watching it either need to be deeply watched, or manually check object equivalence.
  filters: (state, getters, rootState /*, rootGetters */) => {
    const filters = _.get(rootState.route, 'query.filters', {});
    return _.isEmpty(filters) ? FiltersUtil.newFilters() : filters;
  },
  view: (state, getters, rootState /* , rootGetters */) => {
    const view = _.get(rootState.route, 'query.view', DEFAULT_VIEW);
    return view;
  },
  statements: (state, getters, rootState /* , rootGetters */) => {
    return _.get(rootState.route, 'query.statements', defaultStatementsQuery);
  },
  documents: (state, getters, rootState /* , rootGetters */) => {
    return _.get(rootState.route, 'query.documents', defaultDocumentsQuery);
  },
  audits: (state, getters, rootState /* , rootGetters */) => {
    return _.get(rootState.route, 'query.audits', defaultAuditsQuery);
  },
  layout: (state, getters, rootState /* , rootGetters */) => {
    return _.get(rootState.route, 'query.layout', defaultLayout);
  },
  lastQuery: (state) => state.lastQuery,
  cag: (state, getters, rootState /* , rootGetters */) => {
    return _.get(rootState.route, 'query.cag', null);
  },
};

const actions: ActionTree<QueryState, any> = {
  setSearchFilters({ getters }, filters) {
    const query = updateQuery(getters, { filters, ...START_ZERO });
    router.push({ query }).catch(() => {});
  },
  clearLastQuery({ commit }) {
    commit('setLastQuery', null);
  },
  setLastQuery({ commit, getters }, filters) {
    const query = updateQuery(getters, { filters });
    commit('setLastQuery', query);
  },
  addSearchTerm({ getters }, { field, term, operand, isNot }) {
    const filters = _.cloneDeep(getters.filters);

    // Only allow one "score" range. This is an UI facet limitation, the backend does support disjunctions.
    if (
      field === 'score' ||
      field === 'belief' ||
      field === 'temporal' ||
      field === 'num_evidences'
    ) {
      FiltersUtil.removeClause(filters, field, 'or', false);
    }

    if (_.isNil(operand)) operand = 'or';
    if (_.isNil(isNot)) isNot = false;

    FiltersUtil.addSearchTerm(filters, field, term, operand, isNot);

    const query = updateQuery(getters, { filters, ...START_ZERO });
    router.push({ query }).catch(() => {});
  },

  removeSearchTerm({ getters }, { field, term, operand, isNot }) {
    const filters = _.cloneDeep(getters.filters);

    if (_.isNil(operand)) operand = 'or';
    if (_.isNil(isNot)) isNot = false;

    FiltersUtil.removeSearchTerm(filters, field, term, operand, isNot);

    let query = null;
    if (FiltersUtil.isEmpty(filters)) {
      query = updateQuery(getters, { filters: FiltersUtil.newFilters(), ...START_ZERO });
    } else {
      query = updateQuery(getters, { filters, ...START_ZERO });
    }
    router.push({ query }).catch(() => {});
  },

  setSearchClause({ getters }, { field, values, operand, isNot }) {
    const filters = _.cloneDeep(getters.filters);

    if (_.isNil(operand)) operand = 'or';
    if (_.isNil(isNot)) isNot = false;

    FiltersUtil.setClause(filters, field, values, operand, isNot);
    const query = updateQuery(getters, { filters, ...START_ZERO });
    router.push({ query }).catch(() => {});
  },
  setPagination({ getters }, paginationObj: { view: View; from: number; size: number }) {
    const viewQueryObj: QueryUpdate = {};
    viewQueryObj[paginationObj.view] = {
      from: paginationObj.from,
      size: paginationObj.size,
    };
    const query = updateQuery(getters, viewQueryObj);
    router.push({ query }).catch(() => {});
  },
  setOrderBy({ getters }, sortObj: { view: View; field: string; sortOrder: string }) {
    const viewQueryObj: QueryUpdate = {};
    viewQueryObj[sortObj.view] = {
      from: 0,
      sort: {
        [sortObj.field]: sortObj.sortOrder,
      },
    };
    const query = updateQuery(getters, viewQueryObj);
    router.push({ query }).catch(() => {});
  },
  setView({ getters }, view) {
    const query = updateQuery(getters, { view });
    router.push({ query }).catch(() => {});
  },
  setLayout({ getters }, layout) {
    const query = updateQuery(getters, { layout });
    router.push({ query }).catch(() => {});
  },
};

const mutations: MutationTree<QueryState> = {
  setLastQuery(state, query) {
    state.lastQuery = query;
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
