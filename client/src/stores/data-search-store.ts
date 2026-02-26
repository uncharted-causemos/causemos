import _ from 'lodash';
import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import FiltersUtil from '@/utils/filters-util';
import { Filters } from '@/types/Filters';

export const useDataSearchStore = defineStore('dataSearch', () => {
  const route = useRoute();
  const router = useRouter();

  const query = computed(() => route.query);
  const filters = computed<Filters>(() => {
    const f = _.get(route, 'query.filters', {});
    return _.isEmpty(f) ? FiltersUtil.newFilters() : (f as Filters);
  });

  function setSearchFilters(newFilters: Filters) {
    const q: any = {
      filters: Object.assign(
        {},
        filters.value,
        _.pickBy(newFilters, (v) => !_.isNil(v))
      ),
    };
    router.push({ query: q }).catch(() => {});
  }

  return {
    query,
    filters,
    setSearchFilters,
  };
});
