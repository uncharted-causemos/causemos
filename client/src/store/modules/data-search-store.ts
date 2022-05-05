import _ from 'lodash';
import { GetterTree, MutationTree, ActionTree } from 'vuex';
import router from '@/router';
import FiltersUtil from '@/utils/filters-util';
import { Datacube } from '@/types/Datacubes';
import { Filters } from '@/types/Filters';

interface DataSearchState {
  selectedDatacubes: Datacube[];
  ontologyConcepts: string[];
}

const updateQuery = (getters: GetterTree<DataSearchState, any>, { filters }: { filters: Filters }) => {
  const query: any = {
    filters: Object.assign(
      {},
      getters.filters,
      _.pickBy(filters, v => !_.isNil(v))
    )
  };
  return query;
};

const state: DataSearchState = {
  selectedDatacubes: [],
  ontologyConcepts: []
};
const getters: GetterTree<DataSearchState, any> = {
  query: (state, getters, rootState /*, rootGetters */) => {
    return rootState.route.query;
  },
  // selected datacube IDs
  selectedDatacubes: (state: DataSearchState) => state.selectedDatacubes,
  ontologyConcepts: (state: DataSearchState) => state.ontologyConcepts,
  // filters is an object, if watching it either need to be deeply watched, or manually check object equivalence.
  filters: (state: DataSearchState, getters, rootState /*, rootGetters */) => {
    const filters = _.get(rootState.route, 'query.filters', {});
    return _.isEmpty(filters) ? FiltersUtil.newFilters() : filters;
  }
};
const actions: ActionTree<DataSearchState, any> = {
  setSelectedDatacubes({ commit }, datacubes) {
    commit('setSelectedDatacubes', datacubes);
  },
  setSearchFilters({ getters }, filters) {
    const query = updateQuery(getters, { filters });
    router.push({ query }).catch(() => { });
  },
  setOntologyConcepts({ commit }, concepts) {
    commit('setOntologyConcepts', concepts);
  }
};
const mutations: MutationTree<DataSearchState> = {
  setSelectedDatacubes(state, datacubes: Datacube[]) {
    state.selectedDatacubes = datacubes;
  },
  setOntologyConcepts(state, concepts: string[]) {
    state.ontologyConcepts = concepts;
  }
};
export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
