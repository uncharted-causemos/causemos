import _ from 'lodash';
import router from '@/router';
import { LAYOUTS } from '@/utils/graph/layout';
import FiltersUtil from '@/utils/filters-util';

/**
 * Builds a query object withy any of the options available
 */
const updateQuery = (getters, { filters, view, layout, documents, statements, audits }) => {
  const _filters = filters || getters.filters;
  const _layout = layout || getters.layout;
  const _view = view || getters.view;
  const _cag = getters.cag;

  const query = {
    filters: _filters,
    view: _view,
    layout: _layout,
    documents: Object.assign({}, getters.documents, _.pickBy(documents, v => !_.isNil(v))),
    statements: Object.assign({}, getters.statements, _.pickBy(statements, v => !_.isNil(v))),
    audits: Object.assign({}, getters.audits, _.pickBy(audits, v => !_.isNil(v)))
  };
  if (!_.isEmpty(_cag)) {
    query.cag = _cag;
  }

  return query;
};
const defaultDocumentsQuery = Object.freeze({
  from: 0,
  size: 50,
  sort: {}
});
const defaultStatementsQuery = Object.freeze({
  from: 0,
  size: 50,
  sort: {}
});
const defaultAuditsQuery = Object.freeze({
  from: 0,
  size: 50,
  sort: {}
});
const defaultLayout = Object.freeze({
  layoutOption: LAYOUTS.COSE_BILKENT,
  hierarchyDepth: 0,
  direction: 'x',
  showLabels: true,
  showEdges: true,
  edgeOpacity: 0.4,
  minimumNodeDepth: 1
});

const START_ZERO = {
  documents: { from: 0 },
  statements: { from: 0 },
  audits: { from: 0 }
};

const DEFAULT_VIEW = 'documents';

/**
 * Handles query manipulation, the state and mutations are via
 * vuex-router-sync, as such only actions and getters are available.
 */
export default {
  namespaced: true,
  state: {
    lastQuery: null
  },
  getters: {
    query: (state, getters, rootState /*, rootGetters */) => {
      return Object.assign({
        statements: Object.assign({}, defaultStatementsQuery),
        documents: Object.assign({}, defaultDocumentsQuery),
        audits: Object.assign({}, defaultAuditsQuery)
      }, rootState.route.query);
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
    lastQuery: state => state.lastQuery,
    cag: (state, getters, rootState /* , rootGetters */) => {
      return _.get(rootState.route, 'query.cag', null);
    }
  },
  actions: {
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
      if (field === 'score' || field === 'belief' || field === 'temporal' || field === 'num_evidences') {
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
    setPagination({ getters }, { view = DEFAULT_VIEW, from, size }) {
      const viewQueryObj = {};
      viewQueryObj[view] = {
        from,
        size
      };
      const query = updateQuery(getters, viewQueryObj);
      router.push({ query }).catch(() => {});
    },
    setOrderBy({ getters }, { view = DEFAULT_VIEW, field, sortOrder }) {
      const viewQueryObj = {};
      viewQueryObj[view] = {
        from: 0,
        sort: {
          [field]: sortOrder
        }
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
    }
  },
  mutations: {
    setLastQuery(state, query) {
      state.lastQuery = query;
    }
  }
};
