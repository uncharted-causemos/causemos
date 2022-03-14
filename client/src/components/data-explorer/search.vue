<template>
  <div class="search-container">
    <search-bar class="search-bar" :facets="facets" />
    <search-listview
      :datacubes="filteredDatacubes"
      :enableMultipleSelection="enableMultipleSelection"
      class="list-view"
    />
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';
import SearchBar from '@/components/data-explorer/search-bar.vue';
import SearchListview from '@/components/data-explorer/search-listview.vue';
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Search',
  components: {
    SearchBar,
    SearchListview
  },
  props: {
    facets: {
      type: Object,
      default: () => {}
    },
    filteredDatacubes: {
      type: Array,
      default: () => []
    },
    enableMultipleSelection: {
      type: Boolean,
      default: false
    },
    initialDatacubeSelection: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    ...mapGetters({
      filters: 'dataSearch/filters'
    })
  },
  created() {
    // Noote: Since `beforeRouteUpdate` or beforeRouteLeave isn't triggering, use $Watch on route instead.
    // Although this is an valid implementation. further investigation on `beforeRoute` hooks might be needed.
    this.$watch(
      () => this.$route.params,
      () => this.syncStateFromRoute(),
      { immediate: true }
    );
  },
  beforeMount() {
    // Set selected datacubes for ones that are already in the analysis items.
    this.setSelectedDatacubes(this.initialDatacubeSelection);
  },
  methods: {
    ...mapActions({
      setSearchFilters: 'dataSearch/setSearchFilters',
      setSelectedDatacubes: 'dataSearch/setSelectedDatacubes'
    }),
    syncStateFromRoute() {
      const filters = _.get(this.$route, 'query.filters', {});
      this.setSearchFilters(filters);
    }
  }
});
</script>

<style lang='scss' scoped>
@import "~styles/variables";
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
