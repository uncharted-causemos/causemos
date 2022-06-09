<template>
  <div class="data-explorer-container">
    <modal-header
      :nav-back-label="navBackLabel"
      :select-label="selectLabel"
      :selected-search-items="selectedSearchItems"
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
          :enable-multiple-selection="true"
          :selected-search-items="selectedSearchItems"
          @toggle-datacube-selected="toggleDatacubeSelected"
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

import { computed, defineComponent, ref, watch } from 'vue';
import { mapActions, mapGetters } from 'vuex';

import useToaster from '@/services/composables/useToaster';
import FacetsPanel from '../components/data-explorer/facets-panel.vue';
import ModalHeader from '../components/data-explorer/modal-header.vue';
import Search from '../components/data-explorer/search.vue';
import SimplePagination from '../components/data-explorer/simple-pagination.vue';

import { getDatacubes, getDatacubeFacets, getDatacubeMetadataToCache } from '@/services/new-datacube-service';
import { getAnalysis, saveAnalysisState } from '@/services/analysis-service';

import filtersUtil from '@/utils/filters-util';
import { FACET_FIELDS } from '@/utils/datacube-util';
import { ANALYSIS } from '@/utils/messages-util';
import { ProjectType } from '@/types/Enums';
import _ from 'lodash';
import { useRoute } from 'vue-router';
import { useDataAnalysis } from '@/services/composables/useDataAnalysis';
import { AnalysisItem, DataAnalysisState } from '@/types/Analysis';
import { createAnalysisItem, MAX_ANALYSIS_DATACUBES_COUNT } from '@/utils/analysis-util';
import { Datacube } from '@/types/Datacube';
import { calculateResetRegionRankingWeights, didSelectedItemsChange } from '@/services/analysis-service-new';

export default defineComponent({
  name: 'DataExplorer',
  components: {
    Search,
    FacetsPanel,
    ModalHeader,
    SimplePagination
  },
  setup() {
    const route = useRoute();
    const analysisId = computed(() => route.params.analysisId as string);
    const {
      analysisState,
      analysisItems
    } = useDataAnalysis(analysisId);

    const filteredDatacubes = ref<Datacube[]>([]);

    const selectedSearchItems = ref<AnalysisItem[]>([]);
    watch([analysisItems], () => {
      selectedSearchItems.value = analysisItems.value;
    });
    const isDatacubeSelected = (id: string) => {
      return selectedSearchItems.value.find(i => i.id === id) !== undefined;
    };
    const toggleDatacubeSelected = (item: { datacubeId: string; id: string; }) => {
      if (isDatacubeSelected(item.id)) {
        selectedSearchItems.value = selectedSearchItems.value
          .filter(sd => sd.id !== item.id);
      } else {
        const datacube = filteredDatacubes.value.find(datacube =>
          datacube.data_id === item.datacubeId && datacube.id === item.id
        );
        if (datacube === undefined) {
          return;
        }
        const cachedMetadata = getDatacubeMetadataToCache(datacube);
        const visibleDatacubeCount = selectedSearchItems.value
          .filter(item => item.selected)
          .length;
        const isSelected = visibleDatacubeCount < MAX_ANALYSIS_DATACUBES_COUNT;
        selectedSearchItems.value = [
          ...selectedSearchItems.value,
          createAnalysisItem(
            item.id,
            item.datacubeId,
            cachedMetadata,
            isSelected
          )
        ];
      }
    };

    return {
      analysisState,
      filteredDatacubes,
      analysisId,
      toaster: useToaster(),
      analysisItems,
      selectedSearchItems,
      toggleDatacubeSelected
    };
  },
  data: () => ({
    facets: null,
    filteredFacets: null,
    selectLabel: 'Add To Analysis',
    analysis: undefined,
    pageCount: 0,
    pageSize: 50
  }),
  computed: {
    ...mapGetters({
      filters: 'dataSearch/filters',
      project: 'app/project'
    }),
    navBackLabel() {
      return 'Back to ' + (this.analysis ? (this.analysis as any).title : 'analysis');
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
        // Save updated list of analysisItems to the backend
        const newState: DataAnalysisState = {
          ...this.analysisState,
          analysisItems: this.selectedSearchItems
        };
        // If the list of selected datacubes changed, reset region ranking
        //  weights.
        const shouldResetWeights = didSelectedItemsChange(
          this.analysisItems,
          this.selectedSearchItems
        );
        if (shouldResetWeights) {
          newState.regionRankingItemStates = calculateResetRegionRankingWeights(
            this.selectedSearchItems,
            newState.regionRankingItemStates
          );
        }
        await saveAnalysisState(this.analysisId, newState);
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
