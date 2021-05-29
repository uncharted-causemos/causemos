<template>
  <div class="data-explorer-container">
    <modal-header
      :nav-back-label="navBackLabel"
      @close="onCancel" />
    <div class="flex h-100" v-if="datacubes.length > 0">
      <div class="flex h-100">
        <data-explorer-facets-panel
          :datacubes="datacubes"
          :filteredDatacubes="filteredDatacubes"
        />
      </div>
      <search class="flex-grow-1 h-100"
        :datacubes="datacubes"
        :filteredDatacubes="filteredDatacubes"
      />
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { getDatacubes } from '@/services/new-datacube-service';
import { mapActions, mapGetters } from 'vuex';

import DataExplorerFacetsPanel from '@/components/facets-panel/data-explorer-facets-panel';
import ModalHeader from '../components/data-explorer/modal-header.vue';
import Search from '@/components/data-explorer/search';

import filtersUtil from '@/utils/filters-util';

export default {
  name: 'DataExplorer',
  components: {
    Search,
    DataExplorerFacetsPanel,
    ModalHeader
  },
  data: () => ({
    datacubes: [],
    filteredDatacubes: []
  }),
  computed: {
    ...mapGetters({
      filters: 'dataSearch/filters'
    }),
    navBackLabel() {
      if (this.$route.query && this.$route.query.analysisName) {
        return `Data Space ${this.$route.query.analysisName}`;
      } else {
        return 'Data Space';
      }
    }
  },
  watch: {
    filters(n, o) {
      if (filtersUtil.isEqual(n, o)) return;
      this.refresh();
    }
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setSearchResultsCount: 'dataSearch/setSearchResultsCount'
    }),
    onCancel() {
      this.$router.push({ name: 'data' });
    },
    async refresh() {
      await this.fetchAllDatacubes();
    },

    // retrieves filtered and unfiltered datacube lists
    async fetchAllDatacubes() {
      this.enableOverlay();

      // get the filtered data
      const filters = _.cloneDeep(this.filters);
      filtersUtil.setClause(filters, 'type', ['model'], 'or', false);
      this.filteredDatacubes = await getDatacubes(filters);
      this.filteredDatacubes.forEach(item => (item.isAvailable = true));

      // get all data
      const defaultFilters = { clauses: [] };
      filtersUtil.setClause(defaultFilters, 'type', ['model'], 'or', false);
      this.datacubes = await getDatacubes(defaultFilters);
      this.datacubes.forEach(item => (item.isAvailable = true));
      this.setSearchResultsCount(this.filteredDatacubes.length);
      this.disableOverlay();
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";

.data-explorer-container {
  height: 100vh;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}

</style>
