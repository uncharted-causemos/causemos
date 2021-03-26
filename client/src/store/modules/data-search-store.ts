import _ from 'lodash';
import router from '@/router';
import FiltersUtil from '@/utils/filters-util';

const updateQuery = (getters, { filters }) => {
  const query = {
    filters: Object.assign(
      {},
      getters.filters,
      _.pickBy(filters, v => !_.isNil(v))
    )
  };
  return query;
};

export default {
  namespaced: true,
  state: {
    selectedDatacubes: [],
    ontologyConcepts: [],
    lastQuery: null,
    searchResultsCount: 0
  },
  getters: {
    query: (state, getters, rootState /*, rootGetters */) => {
      return rootState.route.query;
    },
    // selected datacube IDs
    selectedDatacubes: state => state.selectedDatacubes,
    searchResultsCount: state => state.searchResultsCount,
    ontologyConcepts: state => state.ontologyConcepts,
    lastQuery: state => state.lastQuery,
    // filters is an object, if watching it either need to be deeply watched, or manually check object equivalence.
    filters: (state, getters, rootState /*, rootGetters */) => {
      const filters = _.get(rootState.route, 'query.filters', {});
      return _.isEmpty(filters) ? FiltersUtil.newFilters() : filters;
    }
  },
  actions: {
    setSelectedDatacubes({ commit }, datacubes) {
      commit('setSelectedDatacubes', datacubes);
    },
    setSearchFilters({ getters }, filters) {
      const query = updateQuery(getters, { filters });
      router.push({ query }).catch(() => { });
    },
    setLastQuery({ commit, getters }, filters) {
      const query = updateQuery(getters, { filters });
      commit('setLastQuery', query);
    },
    setSearchResultsCount({ commit }, searchResultsCount) {
      commit('setSearchResultsCount', searchResultsCount);
    },
    setOntologyConcepts({ commit }, concepts) {
      commit('setOntologyConcepts', concepts);
    }
  },
  mutations: {
    setSelectedDatacubes(state, datacubes) {
      state.selectedDatacubes = datacubes;
    },
    setLastQuery(state, query) {
      state.lastQuery = query;
    },
    setSearchResultsCount(state, searchResultsCount) {
      state.searchResultsCount = searchResultsCount;
    },
    setOntologyConcepts(state, concepts) {
      state.ontologyConcepts = concepts;
    }
  }
};
