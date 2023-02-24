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
        <IndexResultsStructurePreview class="index-structure-preview" />
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
    <IndexResultsBarChartColumn
      class="bars-column"
      :class="{ expanded: isShowingKeyDatasets }"
      :is-showing-key-datasets="isShowingKeyDatasets"
      :index-results-data="indexResultsData"
      @toggle-is-showing-key-datasets="isShowingKeyDatasets = !isShowingKeyDatasets"
    />
    <div class="map map-loading">
      <IndexResultsMap :index-results-data="indexResultsData" />
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import AnalysisOptionsButton from '@/components/analysis-options-button.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import useIndexTree from '@/services/composables/useIndexTree';
import {
  calculateIndexResults,
  calculateOverallWeight,
  findAllDatasets,
} from '@/utils/indextree-util';
import { IndexResultsData } from '@/types/Index';
import { getRegionAggregation } from '@/services/outputdata-service';
import { OutputSpec, RegionalAggregation } from '@/types/Outputdata';
import { normalize } from '@/utils/value-util';
import { DataTransform } from '@/types/Enums';
import IndexResultsBarChartColumn from '@/components/index-results/index-results-bar-chart-column.vue';
import IndexResultsStructurePreview from '@/components/index-results/index-results-structure-preview.vue';
import IndexResultsMap from '@/components/index-results/index-results-map.vue';

// TODO: temporary!
// We probably want to
//  - pre-normalize the data on the backend.
//  - normalize it with respect to the min and max of the dataset across timestamps
//  - Keep original value as well, instead of overriding it with the normalized version
const normalizeCountryData = (regionData: RegionalAggregation) => {
  const clonedRegionData = _.cloneDeep(regionData);
  if (clonedRegionData.country === undefined || clonedRegionData.country.length === 0) {
    return clonedRegionData;
  }
  const countries = clonedRegionData.country;
  const values = countries.map(({ value }) => value);
  const min = _.min(values) ?? 0;
  const max = _.max(values) ?? 0;
  clonedRegionData.country = countries.map((country) => {
    return {
      ...country,
      value: normalize(country.value, min, max),
    };
  });
  return clonedRegionData;
};

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

const { tree } = useIndexTree();

/**
 * Sort high values to the front of the list, then low values, then null values.
 * NOTE: Sorts the list in place.
 * @param list A list of items to be sorted
 * @param accessor A function to indicate which property of the item to sort by
 */
function sortForDisplay<T>(list: T[], accessor: (item: T) => number | null) {
  list.sort((a, b) => {
    const aValue = accessor(a);
    const bValue = accessor(b);
    if (aValue === bValue) {
      return 0;
    }
    if (aValue === null) {
      return 1;
    }
    if (bValue === null) {
      return -1;
    }
    return bValue - aValue;
  });
}

/**
 * Sorts countries and their contributing datasets.
 * Removes any countributing datasets that don't have a value for the current country.
 * @param results Unsorted index results, that may contain contributing datasets with null values.
 */
const prepareResultsForDisplay = (results: IndexResultsData[]): IndexResultsData[] => {
  const preparedResults = _.cloneDeep(results);
  // Remove datasets that don't include the current country
  preparedResults.forEach((countryWithData) => {
    const filteredDatasets = countryWithData.contributingDatasets.filter(
      (value) => value.datasetValue !== null
    );
    // Sort datasets by how much they contributed to the overall value
    sortForDisplay(filteredDatasets, (dataset) => dataset.weightedDatasetValue);
    countryWithData.contributingDatasets = filteredDatasets;
  });
  // Sort countries by overall value
  sortForDisplay(preparedResults, (result) => result.value);
  return preparedResults;
};

const indexResultsData = ref<IndexResultsData[]>([]);
// Whenever the tree changes, fetch data and calculate `indexResultsData`.
watch([tree], async () => {
  // Save a reference to the current version of the tree so that if it changes before all of the
  //  fetch requests return, we only perform calculations and update the state with the most up-to-
  //  date tree structure.
  const frozenTreeState = tree.value;
  // Go through tree and pull out all the datasets.
  //  Multiply each dataset's weight by the weight of each of its ancestor to get the dataset's
  //  overall weight.
  const datasets = findAllDatasets(tree.value);
  // Prepare an "output spec" for each dataset to fetch its regional data
  const promises = datasets.map((dataset) => {
    const outputSpec: OutputSpec = {
      modelId: dataset.datasetId,
      runId: dataset.runId,
      outputVariable: dataset.outputVariable,
      timestamp: dataset.selectedTimestamp,
      transform: DataTransform.None,
      temporalResolution: dataset.temporalResolution,
      temporalAggregation: dataset.temporalAggregation,
      spatialAggregation: dataset.spatialAggregation,
    };
    return getRegionAggregation(outputSpec);
  });
  // Wait for all fetches to complete.
  const unnormalizedRegionDataForEachDataset = await Promise.all(promises);
  if (tree.value !== frozenTreeState) {
    // Tree has changed since the fetches began, so ignore these results.
    return;
  }
  // Normalize data
  const regionDataForEachDataset = unnormalizedRegionDataForEachDataset.map(normalizeCountryData);
  // Calculate each dataset's overall weight
  const overallWeightForEachDataset = datasets.map((dataset) =>
    calculateOverallWeight(frozenTreeState, dataset)
  );
  // All the data has been fetched and normalized, perform the actual result calculations.
  const unsortedResults = calculateIndexResults(
    datasets,
    overallWeightForEachDataset,
    regionDataForEachDataset
  );
  indexResultsData.value = prepareResultsForDisplay(unsortedResults);
});

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
}

.structure-column {
  padding: $column-padding 0;
  overflow-y: auto;
  border-right: 1px solid $un-color-black-10;
  gap: 20px;
}

.horizontal-padding {
  padding: 0 $column-padding;
}

.bars-column {
  &.expanded {
    width: 700px;
  }
}

section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

header {
  gap: 10px;
  h5 {
    flex: 1;
    min-width: 0;
  }
}
.map {
  flex: 1;
  min-width: 0;
}

.map-loading {
  background: $un-color-black-5;
}
</style>
