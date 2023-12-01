<template>
  <div class="bar-chart-panel-container">
    <!-- TODO: switch to qualifiers -->
    <p>Breakdown by (region)</p>
    <!-- TODO: get this from the table components -->
    <div>
      <span class="subdued un-font-small">Region</span>
      <!-- TODO: -->
      <!-- <span class="subdued un-font-small">{{ unit }}</span> -->
      <span class="subdued un-font-small">{{ '# of people' }}</span>
      <!-- <radio-button-group
              :selected-button-value="sortValue"
              :buttons="Object.values(SORT_OPTIONS)"
              @button-clicked="clickRadioButton"
            /> -->
    </div>
    <!-- TODO: support qualifier pagination -->
    <!-- <button v-if="totalDataLength > 0" class="btn btn-sm" @click="requestData">
            Load {{ numberFormatter(totalDataLength) }} values
          </button> -->
    <div class="rows">
      <BarChartPanelRow
        v-for="(row, rowIndex) of rowsWithData"
        :key="rowIndex"
        :histogram-visible="shouldShowDeselectedBars || row.isChecked"
        :item-data="row"
        :max-visible-bar-value="maxVisibleBarValue"
        :min-visible-bar-value="minVisibleBarValue"
        :selected-timeseries-points="selectedTimeseriesPoints"
        @toggle-expanded="toggleExpanded(row.path)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import BarChartPanelRow from '@/components/drilldown-panel/bar-chart-panel-row.vue';
import _ from 'lodash';
import { BreakdownData } from '@/types/Datacubes';
import { TimeseriesPointSelection } from '@/types/Timeseries';
import { toRefs, ref, computed } from '@vue/runtime-core';
import {
  SORT_OPTIONS,
  isStatefulDataNode,
  extractPossibleRows,
  findMaxVisibleBarValue,
  findMinVisibleBarValue,
  constructHierarchichalDataNodeTree,
} from '@/utils/bar-chart-panel-util';
import { watch } from 'vue';

const props = defineProps<{
  orderedAggregationLevelKeys: string[];
  aggregationLevel: number;
  rawData: BreakdownData | null;
  unit: string;
  selectedTimeseriesPoints: TimeseriesPointSelection[];
  selectedItemIds: string[];
  shouldShowDeselectedBars: boolean;
}>();
const {
  rawData,
  aggregationLevel,
  orderedAggregationLevelKeys,
  shouldShowDeselectedBars,
  selectedTimeseriesPoints,
  selectedItemIds,
} = toRefs(props);

const sortValue = ref<string>(SORT_OPTIONS.Name.value);
// TODO: add sort controls
// const setSortValue = (value: 'Name' | 'Value') => {
//   sortValue.value = value;
// };
const statefulData = ref<RootStatefulDataNode | null>(null);
// TODO: extract this business logic to a util function
// TODO: replace watchEffect with watch()
watch(
  [orderedAggregationLevelKeys, rawData, selectedTimeseriesPoints, sortValue],
  () => {
    if (rawData.value === null) return;
    const getColorFromTimeseriesId = (timeseriesId: string) =>
      selectedTimeseriesPoints.value.find((point) => point.timeseriesId === timeseriesId)?.color ??
      '#000';
    statefulData.value = constructHierarchichalDataNodeTree(
      orderedAggregationLevelKeys.value,
      rawData.value,
      getColorFromTimeseriesId,
      sortValue.value
    );
  },
  { immediate: true }
);

// Ensure all entries with an aggregation level before the currently selected one are expanded
//  whenever statefulData is reinitialized or aggregationLevel is changed
watch(
  [statefulData, aggregationLevel],
  () => {
    if (statefulData.value === null) return;
    const computeExpanded = (
      metadataNode: RootStatefulDataNode | StatefulDataNode,
      depthLevel: number
    ) => {
      if (isStatefulDataNode(metadataNode)) {
        metadataNode.isExpanded = depthLevel < aggregationLevel.value;
      }
      metadataNode.children.forEach((child) => {
        computeExpanded(child, depthLevel + 1);
      });
    };
    // Start with -1 because an aggregationLevel of 0 corresponds
    //  to a depthLevel of 1
    computeExpanded(statefulData.value, -1);
  },
  { immediate: true }
);

const maxVisibleBarValue = computed(() => {
  if (_.isNil(statefulData.value)) return 0;
  // + 1 because if aggregationLevel === 0, we need to go 1 level deeper than
  //  the root level.
  return findMaxVisibleBarValue(
    statefulData.value,
    aggregationLevel.value + 1,
    selectedItemIds.value,
    shouldShowDeselectedBars.value
  );
});

const minVisibleBarValue = computed(() => {
  if (_.isNil(statefulData.value)) return 0;
  // + 1 because if aggregationLevel === 0, we need to go 1 level deeper than
  //  the root level.
  return findMinVisibleBarValue(
    statefulData.value,
    aggregationLevel.value + 1,
    selectedItemIds.value,
    shouldShowDeselectedBars.value
  );
});

const rowsWithData = computed(() => {
  if (_.isNil(statefulData.value)) return [];
  return extractPossibleRows(
    statefulData.value,
    [],
    aggregationLevel.value,
    selectedItemIds.value,
    orderedAggregationLevelKeys.value
  ).filter((row) => row.bars.length);
});

const toggleExpanded = (path: string[]) => {
  if (statefulData.value === null) return;
  // Traverse the tree to find the node in question
  let currentNode: RootStatefulDataNode | StatefulDataNode | undefined = statefulData.value;
  for (const itemName of path) {
    currentNode = currentNode.children.find((child) => child.name === itemName);
    if (currentNode === undefined) return;
  }
  if (isStatefulDataNode(currentNode)) {
    currentNode.isExpanded = !currentNode.isExpanded;
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

$un-color-surface-30: #b3b4b5;

$track-height: 2px;
$thumb-size: 16px;
$tick-size: 8px;

h5 {
  margin: 0;
  margin-bottom: 5px;
}

.sort-selection {
  width: fit-content;
  display: flex;
  align-items: center;
  margin-top: 10px;
  margin-bottom: 10px;
  span {
    margin-right: 5px;
  }
}

.aggregation-level-range {
  margin-top: 10px;

  &::-webkit-slider-runnable-track {
    background: $un-color-surface-30;
    height: $track-height;
  }

  &::-webkit-slider-thumb {
    margin-top: -1 * calc(($thumb-size - $track-height) / 2);
  }
}

.aggregation-level-range-container {
  position: relative;
  margin: 15px 0;
}

.aggregation-level-tick {
  width: $tick-size;
  height: $tick-size;
  border: 2px solid $un-color-surface-30;
  background-color: $background-light-1;
  border-radius: 50%;
  position: absolute;
  top: -1 * calc(($tick-size - $track-height) / 2);
  cursor: pointer;
}

.checklist-container {
  margin-top: 5px;
}

.all-radio-button {
  cursor: pointer;
  i {
    width: 16px;
    margin-right: 5px;
  }
}

.units {
  color: $text-color-medium;
  font-weight: bold;
}

.flex-row {
  display: flex;
  justify-content: space-between;
  // If there's only one item, right-align it
  & *:only-child {
    margin-left: auto;
  }
}

.message {
  background: $background-light-2;
  color: $text-color-dark;
  padding: 5px;
}
</style>
