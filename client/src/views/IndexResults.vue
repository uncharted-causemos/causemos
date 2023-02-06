<template>
  <teleport to="#navbar-trailing-teleport-destination">
    <analysis-options-button v-if="analysisName" :analysis-id="analysisId" />
  </teleport>
  <div class="index-results-container flex">
    <div class="flex-col structure-column">
      <section>
        <header class="flex horizontal-padding">
          <h5>Index structure</h5>
          <!-- TODO: hook up modify button -->
          <button disabled class="btn btn-sm">Modify</button>
        </header>
        <div class="index-structure-preview index-structure-preview-loading" />
      </section>
      <section>
        <header class="horizontal-padding">
          <h5>
            Datasets and their percentage of <strong>{{ 'Overall Priority' }}</strong>
          </h5>
        </header>
        <!-- TODO: list view of structure -->
      </section>
    </div>
    <div class="flex-col bars-column" :class="{ expanded: isShowingKeyDatasets }">
      <header class="flex">
        <h5>
          Countries ranked by <strong>{{ 'Overall Priority' }}</strong>
        </h5>
        <button class="btn btn-sm" @click="isShowingKeyDatasets = !isShowingKeyDatasets">
          {{ isShowingKeyDatasets ? 'Hide' : 'Show' }} key datasets for each country
        </button>
      </header>
      <div v-if="isShowingKeyDatasets" class="table-header">
        <p class="index-result-table-output-value-column" />
        <div class="key-datasets-labels index-result-table-key-datasets-column">
          <p class="index-result-table-dataset-name-column">Key datasets</p>
          <p class="index-result-table-dataset-weight-column">Dataset weight</p>
          <p class="index-result-table-dataset-value-column">Value</p>
        </div>
      </div>
      <IndexResultsBarChartRow
        v-for="(country, index) of mockData"
        :key="index"
        :rank="index + 1"
        :row-data="country"
        :is-expanded="isShowingKeyDatasets"
      />
    </div>
    <div class="map map-loading"></div>
  </div>
</template>

<script setup lang="ts">
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import AnalysisOptionsButton from '@/components/analysis-options-button.vue';
import IndexResultsBarChartRow from '@/components/index-results/index-results-bar-chart-row.vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';

const store = useStore();
const route = useRoute();

const analysisId = computed(() => route.params.analysisId as string);
const { analysisName, refresh } = useIndexAnalysis(analysisId);

// Set analysis name on the navbar
onMounted(async () => {
  store.dispatch('app/setAnalysisName', '');
  await refresh();
  store.dispatch('app/setAnalysisName', analysisName.value);
});

// TODO: use real data and calculate colour here using colour scale
const mockData = [
  { name: 'India', value: 100 },
  { name: 'Kazakhstan', value: 39 },
  { name: 'United States of America', value: 25 },
  { name: 'Indonesia', value: 18 },
  { name: 'Pakistan', value: 16 },
  { name: 'Brazil', value: 13 },
  { name: 'Nigeria', value: 8 },
  { name: 'Bangladesh', value: 4 },
  { name: 'Russia', value: 3 },
  { name: 'Russia', value: 3 },
  { name: 'Russia', value: 3 },
];

const isShowingKeyDatasets = ref(false);
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/index-results';
.index-results-container {
  height: $content-full-height;
  background: white;
}

$column-padding: 20px;

.structure-column,
.bars-column {
  width: 400px;
  overflow-y: auto;
  border-right: 1px solid $un-color-black-10;
  gap: 20px;
}

.structure-column {
  padding: $column-padding 0;
}

.horizontal-padding {
  padding: 0 $column-padding;
}

.index-structure-preview {
  height: 150px;
}

.bars-column {
  padding: $column-padding;

  &.expanded {
    width: 800px;
  }
}

.table-header {
  display: flex;
  gap: $index-result-table-column-gap;
  .key-datasets-labels {
    display: flex;
    border-bottom: 1px solid $un-color-black-10;
    gap: $index-result-table-column-gap;
  }
}

section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

header {
  align-items: flex-start;
  h5 {
    flex: 1;
    min-width: 0;
  }
}
.map {
  flex: 1;
  min-width: 0;
}

.map-loading,
.index-structure-preview-loading {
  background: $un-color-black-5;
}
</style>
