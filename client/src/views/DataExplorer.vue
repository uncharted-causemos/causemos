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

import dateFormatter from '@/formatters/date-formatter';

import { getDatacubes, getDatacubeFacets } from '@/services/new-datacube-service';
import { updateAnalysis, deleteAnalysis } from '@/services/analysis-service';

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
    navBackLabel: 'Recent Analyses ',
    selectLabel: 'Add To Analysis'
  }),
  computed: {
    ...mapGetters({
      analysisId: 'dataAnalysis/analysisId',
      filters: 'dataSearch/filters',
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
    },
    async addToAnalysis() {
      try {
        // update analysis name
        await updateAnalysis(this.analysisId, {
          title: `${this.selectedDatacubes[0]} ${dateFormatter(Date.now(), 'MMM DD YYYY - hh:mm:ss')}`
        });
        // update analysis datacubes
        await this.updateAnalysisItemsNew({ currentAnalysisId: this.analysisId, datacubeIDs: this.selectedDatacubes });
        this.$router.push({
          name: 'data',
          params: {
            project: this.project,
            analysisID: this.analysisId,
            projectType: ProjectType.Analysis
          }
        });
      } catch (e) {
        this.toaster(ANALYSIS.ERRONEOUS_RENAME, 'error', true);
      }
    },
    async onClose() {
      this.clear();
      await new Promise((resolve) => {
        setTimeout(() => { resolve(); }, 500);
      });
      this.$router.push({
        name: 'dataStart',
        params: {
          project: this.project,
          projectType: ProjectType.Analysis
        }
      });
    },

    async clear() {
      try {
        await deleteAnalysis(this.analysisId);
        this.toaster(ANALYSIS.SUCCESSFUL_DELETION_UNINITIALIZED, 'success', false);
      } catch (e) {
        this.toaster(ANALYSIS.ERRONEOUS_DELETION_UNINITIALIZED, 'error', true);
      }
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
