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
      <div class="flex-grow-1 h-100">
        <search
          class="search"
          :facets="facets"
          :filtered-datacubes="filteredDatacubes"
          :enableMultipleSelection="false"
        />
        <simple-pagination
          :current-page-length="filteredDatacubes.length"
          :page-count="pageCount"
          :page-size="pageSize"
          @next-page="nextPage"
          @prev-page="prevPage"
        />
      </div>
    </div>
  </div>
</template>

<script>
import _ from 'lodash';
import { mapActions, mapGetters } from 'vuex';

import FacetsPanel from '../components/data-explorer/facets-panel.vue';
import ModalHeader from '../components/data-explorer/modal-header.vue';
import Search from '../components/data-explorer/search.vue';
import SimplePagination from '../components/data-explorer/simple-pagination.vue';


import { getDatacubes, getDatacubeFacets } from '@/services/new-datacube-service';
import modelService from '@/services/model-service';
import { ProjectType } from '@/types/Enums';

import filtersUtil from '@/utils/filters-util';
import { NODE_FACET_FIELDS } from '@/utils/datacube-util';

export default {
  name: 'NodeDataExplorer',
  components: {
    Search,
    FacetsPanel,
    ModalHeader,
    SimplePagination
  },
  data: () => ({
    facets: null,
    filteredDatacubes: [],
    filteredFacets: null,
    selectLabel: 'Quantify Node',
    modelComponents: null,
    pageCount: 0,
    pageSize: 100
  }),
  computed: {
    ...mapGetters({
      filters: 'dataSearch/filters',
      currentCAG: 'app/currentCAG',
      nodeId: 'app/nodeId',
      project: 'app/project',
      selectedDatacubes: 'dataSearch/selectedDatacubes',
      searchResultsCount: 'dataSearch/searchResultsCount'
    }),
    selectedNode() {
      if (this.nodeId === undefined || this.modelComponents === null) {
        return null;
      }
      return this.modelComponents.nodes.find(node => node.id === this.nodeId);
    },
    nodeConceptName() {
      return this.selectedNode?.label;
    },
    navBackLabel() {
      return `Back to ${this.nodeConceptName} Node`;
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

    prevPage() {
      this.pageCount = this.pageCount - 1;
      this.fetchDatacubeList();
    },

    nextPage() {
      this.pageCount = this.pageCount + 1;
      this.fetchDatacubeList();
    },

    getSearchFilters() {
      const searchFilters = _.cloneDeep(this.filters);
      filtersUtil.addSearchTerm(searchFilters, 'type', 'indicator', 'and', false);
      return searchFilters;
    },

    // retrieves filtered datacube list
    async fetchDatacubeList () {
      // get the filtered data
      const searchFilters = this.getSearchFilters();
      const options = {
        from: this.pageCount * this.pageSize,
        size: this.pageSize
      };
      this.filteredDatacubes = await getDatacubes(searchFilters, options);
      this.filteredDatacubes.forEach(item => (item.isAvailable = true));
    },

    // fetches all datacube info in list and facet format
    async fetchAllDatacubeData() {
      this.enableOverlay();
      this.fetchDatacubeList();
      // retrieves filtered & unfiltered facet data
      const searchFilters = this.getSearchFilters();
      const defaultFilters = { clauses: [{ field: 'type', operand: 'and', isNot: false, values: ['indicator'] }] };
      this.facets = await getDatacubeFacets(NODE_FACET_FIELDS, defaultFilters);
      this.filteredFacets = await getDatacubeFacets(NODE_FACET_FIELDS, searchFilters);

      this.disableOverlay();
    },

    async refresh() {
      this.pageCount = 0;
      modelService.getComponents(this.currentCAG).then(_modelComponents => {
        this.modelComponents = _modelComponents;
      });
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
          indicatorId: this.selectedDatacubes[0].id,
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
  .search {
    height: calc(100% - 100px);
  }
}

</style>
