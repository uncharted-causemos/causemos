<template>
  <div class="index-results-container flex" :class="[INSIGHT_CAPTURE_CLASS]">
    <teleport to="#navbar-trailing-teleport-destination" v-if="isMounted">
      <analysis-options-button v-if="analysisName" :analysis-id="analysisId" />
    </teleport>
    <div class="flex-col structure-column">
      <header>
        <Button
          text
          severity="secondary"
          icon="fa fa-arrow-left"
          @click="modifyStructure"
          label="Edit structure"
        />
        <h3>Index results</h3>
      </header>

      <div class="breadcrumbs">
        <template v-for="(breadcrumb, i) of breadcrumbs" :key="breadcrumb.value">
          <i class="fa fa-caret-right" v-if="i !== 0" />
          <Button
            text
            :disabled="i === breadcrumbs.length - 1"
            @click="() => (selectedRegionId = breadcrumb.value)"
            :label="breadcrumb.label"
            size="small"
          />
        </template>
      </div>

      <IndexResultsBarChartColumn
        class="bars-column"
        :class="{ expanded: isShowingKeyDatasets }"
        :is-showing-key-datasets="isShowingKeyDatasets"
        :index-results-data="indexResultsData"
        :index-results-settings="indexResultsSettings"
        :selected-node-name="selectedNodeName"
        :removed-regions="removedRegionsData"
        :hovered-region-id="hoveredRegionId"
        @toggle-is-showing-key-datasets="isShowingKeyDatasets = !isShowingKeyDatasets"
        @hover-row="highlightRegion"
        @stop-hover-row="clearRegionHighlight"
      />
    </div>
    <div class="map">
      <IndexResultsMap
        :index-results-data="indexResultsData"
        :settings="indexResultsSettings"
        :aggregation-level="aggregationLevel"
        :hovered-region-id="hoveredRegionId"
        @click-region="onMapClick"
        @hover-region="highlightRegion"
        @stop-hover-region="clearRegionHighlight"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import useIndexAnalysis from '@/composables/useIndexAnalysis';
import AnalysisOptionsButton from '@/components/analysis-options-button.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import useIndexTree from '@/composables/useIndexTree';
import {
  findAllDatasets,
  convertDataConfigToOutputSpec,
  countOppositeEdgesBetweenNodes,
  calculateOverallWeightForEachDataset,
} from '@/utils/index-tree-util';
import { calculateCoverage, calculateIndexResults } from '@/utils/index-results-util';
import { ConceptNodeWithDatasetAttached, IndexResultsData } from '@/types/Index';
import { getIndexRegionAggregation, TRANSFORM_NORM } from '@/services/outputdata-service';
import IndexResultsBarChartColumn from '@/components/index-results/index-results-bar-chart-column.vue';
import IndexResultsMap from '@/components/index-results/index-results-map.vue';
import { AdminLevel, ProjectType } from '@/types/Enums';
import useInsightStore from '@/composables/useInsightStore';
import { IndexResultsDataState, Insight } from '@/types/Insight';
import { getInsightById } from '@/services/insight-service';
import { INSIGHT_CAPTURE_CLASS, isIndexResultsDataState } from '@/utils/insight-util';
import { RegionalAggregation } from '@/types/Outputdata';
import Button from 'primevue/button';
import {
  adminLevelToString,
  getLevelFromRegionId,
  getParentRegion,
  isAncestorOfRegion,
  REGION_ID_DELIMETER,
} from '@/utils/admin-level-util';
import useHoveredRegionId from '@/composables/useHoveredRegionId';

// This is required because teleported components require their teleport destination to be mounted
//  before they can be rendered.
const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
});

const store = useStore();
const route = useRoute();
const router = useRouter();

const analysisId = computed(() => route.params.analysisId as string);
const { analysisName, indexResultsSettings, refresh, weightingBehaviour } =
  useIndexAnalysis(analysisId);

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

const selectedRegionId = ref<string | null>(null);
const onMapClick = (regionId: string) => {
  if (regionId !== '') {
    // Select the region that was clicked
    selectedRegionId.value = regionId;
  } else if (selectedRegionId.value === null) {
    // We're already at the top level, nothing needs to be done.
  } else {
    const parentRegion = getParentRegion(selectedRegionId.value);
    // Navigate up one level to the parent of the currently selected region
    selectedRegionId.value = parentRegion === '' ? null : parentRegion;
  }
};
// Show regions that are 1 level below the currently selected region.
const aggregationLevel = computed(() =>
  selectedRegionId.value === null
    ? AdminLevel.Country
    : adminLevelToString(getLevelFromRegionId(selectedRegionId.value) + 1)
);
// Used to display which region is currently selected.
// Allows the user to click one of the region's ancestors to navigate back up
//  through the hierarchy.
const breadcrumbs = computed(() => {
  const ancestors = selectedRegionId.value?.split(REGION_ID_DELIMETER) ?? [];
  return [
    { label: 'All countries', value: null },
    ...ancestors.map((region, i) => ({
      label: region,
      value: ancestors.slice(0, i + 1).join(REGION_ID_DELIMETER),
    })),
  ];
});

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
 * Sorts regions and their contributing datasets.
 *
 * Removes any contributing datasets that don't have a value for the current region and removes
 * any regions (stored for review) that are not present in all datasets to avoid misleading data.
 *
 * @param results Unsorted index results, that may contain contributing datasets with null values.
 */
const prepareResultsForDisplay = (results: IndexResultsData[]): IndexResultsData[] => {
  const preparedResultsAll = _.cloneDeep(results);
  const { regionsInAllDatasets } = calculateCoverage(
    regionDataForEachDataset.value,
    aggregationLevel.value
  );
  const preparedResults = preparedResultsAll
    // If a region is selected, filter out any regions that aren't within it.
    .filter(
      (region) =>
        selectedRegionId.value === null ||
        isAncestorOfRegion(selectedRegionId.value, region.regionId)
    )
    // Remove regions that are missing from some datasets during clone.
    .filter((region) => regionsInAllDatasets.has(region.regionId));
  // Remove datasets that don't include the current region
  preparedResults.forEach((regionWithData) => {
    const filteredDatasets = regionWithData.contributingDatasets.filter(
      (value) => value.datasetValue !== null
    );
    // Sort datasets within each result by how much they contributed to the
    //  overall value
    sortForDisplay(filteredDatasets, (dataset) => dataset.weightedDatasetValue);
    regionWithData.contributingDatasets = filteredDatasets;
  });
  // Sort regions by overall value
  sortForDisplay(preparedResults, (result) => result.value);

  return preparedResults;
};

const unsortedResults = ref<IndexResultsData[]>([]);
const indexResultsData = computed(() => prepareResultsForDisplay(unsortedResults.value));

const removedRegionsData = computed(() => {
  const result: { regionId: string; removedFrom: string[] }[] = [];
  unsortedResults.value
    // If a region is selected, filter out any regions that aren't within it.
    // We don't want to include regions that in the "hidden regions" list if
    //  they wouldn't have been shown anyway due to the selected region.
    .filter(
      (region) =>
        selectedRegionId.value === null ||
        isAncestorOfRegion(selectedRegionId.value, region.regionId)
    )
    .forEach((regionData) => {
      const { regionId, contributingDatasets } = regionData;
      // Datasets not found in contributing datasets
      const datasetsMissingThisRegion = datasets.value.filter(
        (dataset) =>
          contributingDatasets.find((cd) => cd.dataset.id === dataset.id)?.datasetValue === null
      );
      if (datasetsMissingThisRegion.length > 0) {
        result.push({
          regionId,
          removedFrom: datasetsMissingThisRegion.map(({ name }) => name),
        });
      }
    });
  return result;
});

const datasets = ref<ConceptNodeWithDatasetAttached[]>([]);
const regionDataForEachDataset = ref<RegionalAggregation[]>([]);

// Whenever the tree changes, fetch data and calculate `indexResultsData`.
watch([tree, weightingBehaviour, aggregationLevel], async () => {
  // Save a reference to the current version of the tree so that if it changes before all of the
  //  fetch requests return, we only perform calculations and update the state with the most up-to-
  //  date tree structure.
  const frozenTreeState = tree.value;
  // Go through tree and pull out all the datasets.
  //  Multiply each dataset's weight by the weight of each of its ancestor to get the dataset's
  //  overall weight.
  datasets.value = findAllDatasets(tree.value);

  // Prepare an "output spec" for each dataset to fetch its regional data
  const promises = datasets.value.map((dataset) =>
    getIndexRegionAggregation({
      ...convertDataConfigToOutputSpec(dataset.dataset.config),
      transform: TRANSFORM_NORM,
      adminLevel: aggregationLevel.value,
    })
  );
  // Wait for all fetches to complete.
  regionDataForEachDataset.value = await Promise.all(promises);

  if (tree.value !== frozenTreeState) {
    // Tree has changed since the fetches began, so ignore these results.
    return;
  }
  // Calculate each dataset's overall weight.
  const overallWeightForEachDataset = calculateOverallWeightForEachDataset(
    frozenTreeState,
    datasets.value,
    weightingBehaviour.value
  );
  // Calculate whether each dataset should be inverted.
  // Datasets can be inverted for two reasons:
  //  1. It represents the opposite of its concept (e.g. a "gdp" dataset on a "poverty" concept)
  //  2. There are "opposite" polarity edges between its concept and the output.
  const shouldDatasetsBeInverted = datasets.value.map((dataset) => {
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
  regionDataForEachDataset.value.forEach((regionData, i) => {
    // If this dataset is inverted, higher original values should map closer to 0 and lower
    //  original values should map closer to 1.
    if (shouldDatasetsBeInverted[i]) {
      regionData.admin1 = regionData.admin1?.map((region) => ({
        id: region.id,
        value: 1 - region.value,
      }));
    }
  });

  // All the data has been fetched and normalized, perform the actual result calculations.
  unsortedResults.value = calculateIndexResults(
    datasets.value,
    overallWeightForEachDataset,
    regionDataForEachDataset.value,
    aggregationLevel.value
  );
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
const updateStateFromInsight = async (insightId: string) => {
  const loadedInsight: Insight = await getInsightById(insightId);
  const dataState = loadedInsight?.data_state;
  console.log('dataState', dataState, !dataState, !isIndexResultsDataState(dataState));
  if (!dataState || !isIndexResultsDataState(dataState)) {
    // This state can occur when we're jumping to the live context of an
    //  insight taken from a different page.
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

const { hoveredRegionId, highlightRegion, clearRegionHighlight } = useHoveredRegionId();
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
  padding: $column-padding;
  border-right: 1px solid $un-color-black-10;
  gap: 3rem;
}

.breadcrumbs {
  display: flex;
  gap: 5px;
  align-items: center;

  i {
    color: var(--p-surface-400);
    font-size: 1rem;
  }
}

.bars-column {
  width: 300px;
  flex: 1;
  min-height: 0;
  &.expanded {
    width: 600px;
  }
}

section {
  display: flex;
  flex-direction: column;
  gap: 5px;
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
