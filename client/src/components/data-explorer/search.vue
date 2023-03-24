<template>
  <div class="search-container">
    <search-bar class="search-bar" :facets="facets" />
    <search-listview
      :datacubes="filteredDatacubes"
      :enableMultipleSelection="enableMultipleSelection"
      :selected-search-items="selectedSearchItems"
      @toggle-datacube-selected="toggleDatacubeSelected"
      @set-datacube-selected="setDatacubeSelected"
      class="list-view"
    />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';
import SearchBar from '@/components/data-explorer/search-bar.vue';
import SearchListview from '@/components/data-explorer/search-listview.vue';
import { defineComponent, PropType } from 'vue';
import { Datacube } from '@/types/Datacube';

export default defineComponent({
  name: 'Search',
  components: {
    SearchBar,
    SearchListview,
  },
  props: {
    facets: {
      type: Object,
      default: () => {},
    },
    filteredDatacubes: {
      type: Array as PropType<Datacube[]>,
      default: () => [],
    },
    enableMultipleSelection: {
      type: Boolean,
      default: false,
    },
    selectedSearchItems: {
      type: Array as PropType<{ id: string /** datacube id */ }[]>,
      required: true,
    },
  },
  computed: {
    ...mapGetters({
      filters: 'dataSearch/filters',
    }),
  },
  emits: ['toggle-datacube-selected', 'set-datacube-selected'],
  created() {
    // Noote: Since `beforeRouteUpdate` or beforeRouteLeave isn't triggering, use $Watch on route instead.
    // Although this is an valid implementation. further investigation on `beforeRoute` hooks might be needed.
    this.$watch(
      () => this.$route.params,
      () => this.syncStateFromRoute(),
      { immediate: true }
    );
  },
  methods: {
    ...mapActions({
      setSearchFilters: 'dataSearch/setSearchFilters',
    }),
    syncStateFromRoute() {
      const filters = _.get(this.$route, 'query.filters', {});
      this.setSearchFilters(filters);
    },
    toggleDatacubeSelected(item: { datacubeId: string; id: string }) {
      this.$emit('toggle-datacube-selected', item);
    },
    setDatacubeSelected(item: { datacubeId: string; id: string }) {
      this.$emit('set-datacube-selected', item);
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.search-container {
  min-height: 0px;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding-top: 10px;
  padding-right: 10px;
  gap: 5px;

  .list-view {
    flex: 1;
    min-height: 0;
  }
}
</style>
