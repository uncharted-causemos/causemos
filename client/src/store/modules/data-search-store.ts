import _ from 'lodash';
import { GetterTree, MutationTree, ActionTree } from 'vuex';
import router from '@/router';
import FiltersUtil from '@/utils/filters-util';
import { Filters } from '@/types/Filters';

const updateQuery = (getters: GetterTree<any, any>, { filters }: { filters: Filters }) => {
  const query: any = {
    filters: Object.assign(
      {},
      getters.filters,
      _.pickBy(filters, v => !_.isNil(v))
    )
  };
  return query;
};
const getters: GetterTree<any, any> = {
  query: (state, getters, rootState /*, rootGetters */) => {
    return rootState.route.query;
  },
  // filters is an object, if watching it either need to be deeply watched, or manually check object equivalence.
  filters: (state, getters, rootState /*, rootGetters */) => {
    const filters = _.get(rootState.route, 'query.filters', {});
    return _.isEmpty(filters) ? FiltersUtil.newFilters() : filters;
  }
};
const actions: ActionTree<any, any> = {
  setSearchFilters({ getters }, filters) {
    const query = updateQuery(getters, { filters });
    router.push({ query }).catch(() => { });
  }
};
const mutations: MutationTree<any> = {};
export default {
  namespaced: true,
  state: {},
  getters,
  actions,
  mutations
};
