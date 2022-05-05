<template>
  <div class="data-explorer-container">
    <modal-header
      :nav-back-label="navBackLabel"
      :select-label="selectLabel"
      @close="onClose"
      @selection="addToAnalysis"
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
          :enableMultipleSelection="true"
          :initialDatacubeSelection="initialDatacubeSelection"
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

<script lang="ts">

import { defineComponent } from 'vue';
import { mapActions, mapGetters } from 'vuex';

import useToaster from '@/services/composables/useToaster';
import FacetsPanel from '../components/data-explorer/facets-panel.vue';
import ModalHeader from '../components/data-explorer/modal-header.vue';
import Search from '../components/data-explorer/search.vue';
import SimplePagination from '../components/data-explorer/simple-pagination.vue';

import { getDatacubes, getDatacubeFacets } from '@/services/new-datacube-service';
import { getAnalysis } from '@/services/analysis-service';

import filtersUtil from '@/utils/filters-util';
import { FACET_FIELDS } from '@/utils/datacube-util';
import { ANALYSIS } from '@/utils/messages-util';
import { ProjectType } from '@/types/Enums';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';

export default defineComponent({
  name: 'DataExplorer',
  components: {
    Search,
    FacetsPanel,
    ModalHeader,
    SimplePagination
  },
  setup() {
    return {
      toaster: useToaster()
    };
  },
  data: () => ({
    facets: null,
    filteredDatacubes: [],
    filteredFacets: null,
    selectLabel: 'Add To Analysis',
    analysis: undefined,
    pageCount: 0,
    pageSize: 100
  }),
  computed: {
    ...mapGetters({
      analysisId: 'dataAnalysis/analysisId',
      filters: 'dataSearch/filters',
      project: 'app/project',
      selectedDatacubes: 'dataSearch/selectedDatacubes',
      analysisItems: 'dataAnalysis/analysisItems'
    }),
    navBackLabel() {
      return 'Back to ' + (this.analysis ? (this.analysis as any).title : 'analysis');
    },
    initialDatacubeSelection() {
      return this.analysisItems;
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
      updateAnalysisItems: 'dataAnalysis/updateAnalysisItems',
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

    // retrieves filtered datacube list
    async fetchDatacubeList () {
      this.enableOverlay();
      // get the filtered data
      const options = {
        from: this.pageCount * this.pageSize,
        size: this.pageSize
      };
      this.filteredDatacubes = await getDatacubes(this.filters, options);
      this.disableOverlay();
    },

    // fetches all datacube info in list and facet format
    async fetchAllDatacubeData() {
      this.fetchDatacubeList();
      this.enableOverlay();
      // retrieves filtered & unfiltered facet data
      const defaultFilters = { clauses: [] };
      this.facets = await getDatacubeFacets(FACET_FIELDS, defaultFilters);
      this.filteredFacets = await getDatacubeFacets(FACET_FIELDS, this.filters);

      this.disableOverlay();
    },

    async refresh() {
      this.pageCount = 0;
      await this.fetchAllDatacubeData();
      this.analysis = await getAnalysis(this.analysisId);
    },
    async addToAnalysis() {
      try {
        // save the selected datacubes in the analysis object in the store/server
        const selectedDatacubes = _.cloneDeep(this.selectedDatacubes);
        selectedDatacubes.forEach((datacube: any) => {
          if (!datacube.itemId) {
            datacube.itemId = uuidv4();
          }
        });
        await this.updateAnalysisItems({ currentAnalysisId: this.analysisId, analysisItems: selectedDatacubes });
        this.$router.push({
          name: 'dataComparative',
          params: {
            project: this.project,
            analysisId: this.analysisId,
            projectType: ProjectType.Analysis
          }
        });
      } catch (e) {
        this.toaster(ANALYSIS.ERRONEOUS_RENAME, 'error', true);
      }
    },
    async onClose() {
      this.$router.push({
        name: 'dataComparative',
        params: {
          project: this.project,
          analysisId: this.analysisId,
          projectType: ProjectType.Analysis
        }
      });
    }
  }
});
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
