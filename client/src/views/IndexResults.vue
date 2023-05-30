<template>
  <teleport to="#navbar-trailing-teleport-destination">
    <analysis-options-button v-if="analysisName" :analysis-id="analysisId" />
  </teleport>
  <div class="index-results-container flex" :class="[INSIGHT_CAPTURE_CLASS]">
    <div class="flex-col structure-column">
      <header>
        <button class="btn btn-sm" @click="modifyStructure">
          <i class="fa fa-fw fa-caret-left" />Edit structure
        </button>
        <h3>Index results</h3>
        <p class="subtitle">{{ selectedNodeName }}</p>
      </header>
      <section>
        <header class="flex index-structure-header">
          <h4>Index structure</h4>
        </header>
        <IndexResultsStructurePreview class="index-structure-preview" :selected-node-id="tree.id" />
        <IndexResultsComponentList />
      </section>
      <section>
        <IndexResultsDatasetWeights :selected-node-name="selectedNodeName" />
      </section>
    </div>
    <div class="map">
      <IndexResultsMap :index-results-data="indexResultsData" :settings="indexResultsSettings" />
    </div>
    <IndexResultsBarChartColumn
      class="bars-column"
      :class="{ expanded: isShowingKeyDatasets }"
      :is-showing-key-datasets="isShowingKeyDatasets"
      :index-results-data="indexResultsData"
      :index-results-settings="indexResultsSettings"
      :selected-node-name="selectedNodeName"
      @toggle-is-showing-key-datasets="isShowingKeyDatasets = !isShowingKeyDatasets"
    />
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import AnalysisOptionsButton from '@/components/analysis-options-button.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import useIndexTree from '@/services/composables/useIndexTree';
import {
  calculateOverallWeight,
  findAllDatasets,
  convertDataConfigToOutputSpec,
  countOppositeEdgesBetweenNodes,
} from '@/utils/index-tree-util';
import { calculateIndexResults } from '@/utils/index-results-util';
import { IndexResultsData } from '@/types/Index';
import { getRegionAggregationNormalized } from '@/services/outputdata-service';
import IndexResultsBarChartColumn from '@/components/index-results/index-results-bar-chart-column.vue';
import IndexResultsStructurePreview from '@/components/index-results/index-results-structure-preview.vue';
import IndexResultsMap from '@/components/index-results/index-results-map.vue';
import IndexResultsComponentList from '@/components/index-results/index-results-component-list.vue';
import IndexResultsDatasetWeights from '@/components/index-results/index-results-dataset-weights.vue';
import { ProjectType } from '@/types/Enums';
import useInsightStore from '@/services/composables/useInsightStore';
import { IndexResultsDataState, Insight } from '@/types/Insight';
import { getInsightById } from '@/services/insight-service';
import useToaster from '@/services/composables/useToaster';
import { TYPE } from 'vue-toastification';
import { INSIGHT_CAPTURE_CLASS, isIndexResultsDataState } from '@/utils/insight-util';

const store = useStore();
const route = useRoute();
const router = useRouter();

const analysisId = computed(() => route.params.analysisId as string);
const { analysisName, indexResultsSettings, refresh } = useIndexAnalysis(analysisId);

const project = computed(() => store.getters['app/project']);
const modifyStructure = () => {
  router.push({
    name: 'indexStructure',
    params: {
      project: project.value,
      analysisId: analysisId.value,
      projectType: ProjectType.Analysis,
    },
  });
};

// Set analysis name on the navbar
onMounted(async () => {
  store.dispatch('app/setAnalysisName', '');
  await refresh();
  store.dispatch('app/setAnalysisName', analysisName.value);
});

const { tree } = useIndexTree();

const selectedNodeName = computed(() => tree.value.name);

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
  const promises = datasets.map((dataset) =>
    getRegionAggregationNormalized(convertDataConfigToOutputSpec(dataset.dataset.config))
  );
  // Wait for all fetches to complete.
  const regionDataForEachDataset = await Promise.all(promises);
  if (tree.value !== frozenTreeState) {
    // Tree has changed since the fetches began, so ignore these results.
    return;
  }
  // Calculate each dataset's overall weight.
  const overallWeightForEachDataset = datasets.map((dataset) =>
    calculateOverallWeight(frozenTreeState, dataset)
  );
  // Calculate whether each dataset should be inverted.
  // Datasets can be inverted for two reasons:
  //  1. It represents the opposite of its concept (e.g. a "gdp" dataset on a "poverty" concept)
  //  2. There are "opposite" polarity edges between its concept and the output.
  const shouldDatasetsBeInverted = datasets.map((dataset) => {
    const oppositeEdgeCount = countOppositeEdgesBetweenNodes(dataset, frozenTreeState);
    const isOppositeEdgeCountOdd = oppositeEdgeCount % 2 === 1;
    const isDatasetInverted = dataset.dataset.isInverted;
    // Exclusive-or
    return (
      (isOppositeEdgeCountOdd && !isDatasetInverted) ||
      (isDatasetInverted && !isOppositeEdgeCountOdd)
    );
  });
  // Invert those datasets.
  regionDataForEachDataset.forEach((regionData, i) => {
    // If this dataset is inverted, higher original values should map closer to 0 and lower
    //  original values should map closer to 1.
    if (shouldDatasetsBeInverted[i]) {
      regionData.country = regionData.country?.map((country) => ({
        id: country.id,
        value: 1 - country.value,
      }));
    }
  });

  // All the data has been fetched and normalized, perform the actual result calculations.
  const unsortedResults = calculateIndexResults(
    datasets,
    overallWeightForEachDataset,
    regionDataForEachDataset
  );
  indexResultsData.value = prepareResultsForDisplay(unsortedResults);
});

const isShowingKeyDatasets = ref(false);

const { setContextId, setDataState, setViewState } = useInsightStore();
onMounted(() => {
  setContextId(analysisId.value + '--results');
});

// Whenever state changes, sync it to insight panel store so that the latest state is captured when
//  taking an insight.
watch(
  [isShowingKeyDatasets],
  () => {
    const newDataState: IndexResultsDataState = {
      isShowingKeyDatasets: isShowingKeyDatasets.value,
    };
    setDataState(newDataState);
    // No view state for this page. Set it to an empty object so that any view state from previous
    //  pages is cleared and not associated with insights taken from this page.
    setViewState({});
  },
  { immediate: true }
);
const toaster = useToaster();
const updateStateFromInsight = async (insightId: string) => {
  const loadedInsight: Insight = await getInsightById(insightId);
  const dataState = loadedInsight?.data_state;
  if (!dataState || !isIndexResultsDataState(dataState)) {
    toaster('Unable to apply the insight you selected.', TYPE.ERROR, false);
    return;
  }
  isShowingKeyDatasets.value = dataState.isShowingKeyDatasets;
};

watch(
  [route],
  () => {
    const insight_id = route.query.insight_id as any;
    if (insight_id !== undefined) {
      updateStateFromInsight(insight_id);
      // Remove the insight_id from the url so that
      //  (1) future insight capture is valid
      //  (2) we can re-apply the same insight if necessary
      router
        .push({
          query: { insight_id: undefined },
        })
        .catch(() => {});
    }
  },
  { immediate: true }
);
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

.structure-column {
  width: 400px;
  padding: $column-padding;
  overflow-y: auto;
  border-right: 1px solid $un-color-black-10;
  gap: 20px;
}

.bars-column {
  width: 300px;
  border-left: 1px solid $un-color-black-10;
  &.expanded {
    width: 600px;
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

.subtitle {
  color: $un-color-black-40;
}

.index-structure-header {
  justify-content: space-between;
}
.map {
  flex: 1;
  min-width: 0;
  background: $un-color-black-5;
}
</style>
