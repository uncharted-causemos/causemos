<template>
  <div class="data-explorer-container">
    <modal-header
      :nav-back-label="navBackLabel"
    />
    <div class="flex h-100" v-if="facets !== null && filteredFacets !== null">
      <div class="flex h-100">
        <facets-panel
          :facets="facets"
          :filtered-facets="filteredFacets"
        />
      </div>
      <search class="flex-grow-1 h-100"
        :facets="facets"
        :filtered-datacubes="filteredDatacubes"
      />
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

import FacetsPanel from '../components/data-explorer/facets-panel.vue';
import ModalHeader from '../components/data-explorer/modal-header.vue';
import Search from '../components/data-explorer/search.vue';

import { getDatacubes, getDatacubeFacets } from '@/services/new-datacube-service';

import filtersUtil from '@/utils/filters-util';
import { FACET_FIELDS } from '@/utils/datacube-util';

export default {
  name: 'DataExplorer',
  components: {
    Search,
    FacetsPanel,
    ModalHeader
  },
  data: () => ({
    facets: null,
    filteredDatacubes: [],
    filteredFacets: null
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

    async refresh() {
      await this.fetchAllDatacubeData();
    },

    // retrieves filtered datacube list
    async fetchAllDatacubeData() {
      this.enableOverlay();

      // get the filtered data
      const filters = _.cloneDeep(this.filters);
      filtersUtil.setClause(filters, 'type', ['model'], 'or', false);
      this.filteredDatacubes = await getDatacubes(filters);
      this.filteredDatacubes.forEach(item => (item.isAvailable = true));

      // retrieves filtered & unfiltered facet data
      const defaultFilters = { clauses: [] };
      this.facets = await getDatacubeFacets(FACET_FIELDS, defaultFilters);
      this.filteredFacets = await getDatacubeFacets(FACET_FIELDS, filters);

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
