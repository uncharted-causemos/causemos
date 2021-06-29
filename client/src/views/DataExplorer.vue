<template>
  <div class="data-explorer-container">
    <rename-modal
      v-if="showRenameModal"
      :modal-title="'Name New Analysis'"
      current-name=""
      @confirm="onRenameModalConfirm"
      @cancel="onRenameModalClose"
    />
    <modal-header
      :nav-back-label="navBackLabel"
      @update-analysis="renameAnalysis"
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
import RenameModal from '../components/action-bar/rename-modal.vue';
import Search from '../components/data-explorer/search.vue';

import { getDatacubes, getDatacubeFacets } from '@/services/new-datacube-service';
import { updateAnalysis } from '@/services/analysis-service';

import filtersUtil from '@/utils/filters-util';
import { FACET_FIELDS } from '@/utils/datacube-util';
import { ANALYSIS } from '@/utils/messages-util';
import { ProjectType } from '@/types/Enums';

export default {
  name: 'DataExplorer',
  components: {
    Search,
    FacetsPanel,
    ModalHeader,
    RenameModal
  },
  data: () => ({
    facets: null,
    filteredDatacubes: [],
    filteredFacets: null,
    showRenameModal: false
  }),
  computed: {
    ...mapGetters({
      analysisId: 'dataAnalysis/analysisId',
      filters: 'dataSearch/filters',
      project: 'app/project',
      selectedDatacubes: 'dataSearch/selectedDatacubes',
      searchResultsCount: 'dataSearch/searchResultsCount'
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
      updateAnalysisItemsNew: 'dataAnalysis/updateAnalysisItemsNew',
      enableOverlay: 'app/enableOverlay',
      disableOverlay: 'app/disableOverlay',
      setSearchResultsCount: 'dataSearch/setSearchResultsCount'
    }),

    async addToAnalysis() {
      await this.updateAnalysisItemsNew({ currentAnalysisId: this.analysisId, datacubeIDs: this.selectedDatacubes });
      this.$router.push({
        name: 'data',
        params: {
          collection: this.project,
          analysisID: this.analysisId,
          projectType: ProjectType.Analysis
        }
      });
    },

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
    async onRenameModalConfirm(newName) {
      try {
        await updateAnalysis(this.analysisId, { title: newName });
        await this.updateAnalysisItemsNew({ currentAnalysisId: this.analysisId, datacubeIDs: this.selectedDatacubes });
        this.toaster(ANALYSIS.SUCCESSFUL_RENAME, 'success', false);
        this.$router.push({
          name: 'data',
          params: {
            collection: this.project,
            analysisID: this.analysisId,
            projectType: ProjectType.Analysis
          }
        });
      } catch (e) {
        this.toaster(ANALYSIS.ERRONEOUS_RENAME, 'error', true);
      }
      this.onRenameModalClose();
    },
    onRenameModalClose() {
      this.showRenameModal = false;
    },

    renameAnalysis() {
      this.showRenameModal = true;
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
