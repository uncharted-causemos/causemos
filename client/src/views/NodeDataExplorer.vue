<template>
  <div class="data-explorer-container">
    <modal-header
      :nav-back-label="navBackLabel"
      :select-label="selectLabel"
      @close="onClose"
      @selection="selectData"
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
import { NODE_FACET_FIELDS } from '@/utils/datacube-util';
import { ProjectType } from '@/types/Enums';

export default {
  name: 'NodeDataExplorer',
  components: {
    Search,
    FacetsPanel,
    ModalHeader
  },
  data: () => ({
    facets: null,
    filteredDatacubes: [],
    filteredFacets: null,
    navBackLabel: 'Back To Node Grounding',
    selectLabel: 'Quantify Node'
  }),
  computed: {
    ...mapGetters({
      filters: 'dataSearch/filters',
      currentCAG: 'app/currentCAG',
      nodeId: 'app/nodeId',
      project: 'app/project',
      selectedDatacubes: 'dataSearch/selectedDatacubes',
      searchResultsCount: 'dataSearch/searchResultsCount'
    })
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
      updateAnalysisItemsNew: 'dataAnalysis/updateAnalysisItemsNew',
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setSearchResultsCount: 'dataSearch/setSearchResultsCount'
    }),

    // retrieves filtered datacube list
    async fetchAllDatacubeData() {
      this.enableOverlay();

      // get the filtered data
      const searchFilters = _.cloneDeep(this.filters);
      filtersUtil.addSearchTerm(searchFilters, 'type', 'indicator', 'and', false);
      this.filteredDatacubes = await getDatacubes(searchFilters);
      this.filteredDatacubes.forEach(item => (item.isAvailable = true));

      // retrieves filtered & unfiltered facet data
      const defaultFilters = { clauses: [{ field: 'type', operand: 'and', isNot: false, values: ['indicator'] }] };
      this.facets = await getDatacubeFacets(NODE_FACET_FIELDS, defaultFilters);
      this.filteredFacets = await getDatacubeFacets(NODE_FACET_FIELDS, searchFilters);

      this.disableOverlay();
    },

    async refresh() {
      await this.fetchAllDatacubeData();
    },

    onClose() {
      this.$router.push({
        name: 'nodeDrilldown',
        params: {
          currentCAG: this.currentCAG,
          nodeId: this.nodeId,
          project: this.project,
          projectType: ProjectType.Analysis
        }
      });
    },

    selectData () {
      this.$router.push({
        name: 'nodeCompExperiment',
        params: {
          currentCAG: this.currentCAG,
          datacubeId: this.selectedDatacubes[0],
          nodeId: this.nodeId,
          project: this.project,
          projectType: ProjectType.Analysis
        }
      });
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
