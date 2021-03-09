<template>
  <div class="search-container flex">
    <div class="left-panel h-100">
      <!-- facets goes here -->
    </div>
    <div class="search-panel flex-grow-1 flex-col h-100">
      <div class="search-bar-box">
        <search-bar />
      </div>
      <div class="tab-panel flex-grow-1 h-0 flex-col">
        <tab-bar
          class="tab-bar"
          :tabs="tabs"
          :active-tab-id="view"
          @tab-click="setActive"
        />
        <div class="tab-content flex-grow-1 h-0">
          <div class="tab-pane active h-100">
            <search-listview />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
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
  beforeRouteUpdate(to, from, next) {
    // Try to keep the search state so we can restore when navigating back from other pages
    this.setLastQuery(this.filters);
    next();
  },
  beforeRouteLeave(to, from, next) {
    // Try to keep the search state so we can restore when navigating back from other pages
    this.setLastQuery(this.filters);
    next();
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
  computed: {
    ...mapGetters({
      filters: 'dataSearch/filters',
      analysisItems: 'dataAnalysis/analysisItems'
    })
  },
  created() {
    this.view = 'list';
  },
  beforeMount() {
    // Set selected datacubes for ones that are already in the analysis items.
    this.setSelectedDatacubes(this.analysisItems.map(item => item.id));
  },
  methods: {
    ...mapActions({
      setLastQuery: 'dataSearch/setLastQuery',
      setSelectedDatacubes: 'dataSearch/setSelectedDatacubes'
    }),
    setActive(tabId) {
      this.setView(tabId);
    }
  }
};
</script>

<style lang='scss' scoped>
@import "~styles/variables";
.search-container {
  min-height: 0px;
  .search-bar-box {
    padding: 6px 8px 0px;
  }
  .search-resaults {
    padding: 20px;
  }
  .scrollable {
    overflow-y: auto;
  }
  .card-limit-label {
    padding: 5px 0;
  }
  .tab-bar {
    margin-left: 10px;
  }
}
</style>
