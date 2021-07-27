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
      <search class="flex-grow-1 h-100"
        :facets="facets"
        :filtered-datacubes="filteredDatacubes"
        :enableMultipleSelection="enableMultipleSelection"
        :initialDatacubeSelection="initialDatacubeSelection"
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
import { getAnalysis } from '@/services/analysis-service';

import filtersUtil from '@/utils/filters-util';
import { FACET_FIELDS } from '@/utils/datacube-util';
import { ANALYSIS } from '@/utils/messages-util';
import { ProjectType } from '@/types/Enums';

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
    filteredFacets: null,
    selectLabel: 'Add To Analysis',
    analysis: undefined,
    enableMultipleSelection: true
  }),
  computed: {
    ...mapGetters({
      analysisId: 'dataAnalysis/analysisId',
      filters: 'dataSearch/filters',
      project: 'app/project',
      selectedDatacubes: 'dataSearch/selectedDatacubes',
      searchResultsCount: 'dataSearch/searchResultsCount',
      analysisItems: 'dataAnalysis/analysisItems'
    }),
    navBackLabel() {
      return 'Back to ' + (this.analysis ? this.analysis.title : 'analysis');
    },
    initialDatacubeSelection() {
      return this.analysisItems.map(item => {
        return {
          id: item.id,
          datacubeId: item.data_id
        };
      });
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
      updateAnalysisItemsNew: 'dataAnalysis/updateAnalysisItemsNew',
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setSearchResultsCount: 'dataSearch/setSearchResultsCount'
    }),

    // retrieves filtered datacube list
    async fetchAllDatacubeData() {
      this.enableOverlay();

      // get the filtered data
      const filters = _.cloneDeep(this.filters);
      this.filteredDatacubes = await getDatacubes(filters);
      this.filteredDatacubes.forEach(item => (item.isAvailable = true));

      // retrieves filtered & unfiltered facet data
      const defaultFilters = { clauses: [] };
      this.facets = await getDatacubeFacets(FACET_FIELDS, defaultFilters);
      this.filteredFacets = await getDatacubeFacets(FACET_FIELDS, filters);

      this.disableOverlay();
    },

    async refresh() {
      await this.fetchAllDatacubeData();
      this.analysis = await getAnalysis(this.analysisId);
    },
    async addToAnalysis() {
      try {
        // save the selected datacubes in the analysis object in the store/server
        await this.updateAnalysisItemsNew({ currentAnalysisId: this.analysisId, analysisItems: this.selectedDatacubes });

        if (this.enableMultipleSelection) {
          this.$router.push({
            name: 'dataComparative',
            params: {
              project: this.project,
              analysisId: this.analysisId,
              projectType: ProjectType.Analysis
            }
          });
        } else {
          this.$router.push({
            name: 'data',
            params: {
              project: this.project,
              analysisId: this.analysisId,
              projectType: ProjectType.Analysis
            }
          });
        }
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
