<template>
  <div class="search-container flex">
    <div class="search-panel">
      <div class="search-bar-section">
        <search-bar :facets="facets" />
      </div>
      <div class="tab-section">
        <tab-bar
          class="tab-bar"
          :tabs="tabs"
          :active-tab-id="view"
          @tab-click="setActive"
        />
        <div class="tab-content">
          <div class="tab-pane active">
            <search-listview :datacubes="filteredDatacubes"/>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';
import SearchBar from '@/components/data-explorer/search-bar';
import SearchListview from '@/components/data-explorer/search-listview';
import TabBar from '../widgets/tab-bar.vue';

export default {
  name: 'Search',
  components: {
    SearchBar,
    SearchListview,
    TabBar
  },
  data: () => ({
    tabs: [
      {
        name: 'List',
        id: 'list'
      }
      // Map tab is not yet implemented
      // {
      //   name: 'Map',
      //   id: 'map'
      // }
    ]
  }),
  props: {
    facets: {
      type: Object,
      default: () => {}
    },
    filteredDatacubes: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    ...mapGetters({
      filters: 'dataSearch/filters',
      analysisItems: 'dataAnalysis/analysisItems'
    })
  },
  created() {
    this.view = 'list';
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
    this.setSelectedDatacubes(this.analysisItems.map(item => item.id));
  },
  methods: {
    ...mapActions({
      setSearchFilters: 'dataSearch/setSearchFilters',
      setSelectedDatacubes: 'dataSearch/setSelectedDatacubes'
    }),
    setActive(tabId) {
      this.setView(tabId);
    },
    syncStateFromRoute() {
      const filters = _.get(this.$route, 'query.filters', {});
      this.setSearchFilters(filters);
    }
  }
};
</script>

<style lang='scss' scoped>
@import "~styles/variables";
.search-container {
  min-height: 0px;
  .search-panel {
    display: flex;
    flex-direction: column;
    align-content: stretch;
    align-self: stretch;
    .search-bar-section {
      padding: 6px 8px 0px;
      flex: 0 0 auto;
      align-self: stretch;

    }
    .tab-section {
      flex: 1 1 auto;
      align-self: stretch;
      display: flex;
      flex-direction: column;
      align-content: stretch;
      overflow: hidden;
      .tab-bar {
        margin-left: 10px;
        flex: 0 0 auto;
        align-self: stretch;
      }
      .tab-content {
        flex: 1 1 auto;
        align-self: stretch;
        overflow-y: auto;
        padding: 0 0 50px;
      }
    }
  }
}
</style>
