<template>
  <div class="bar-chart-panel-container">
    <p>{{ aggregationMethod === AggregationOption.Mean ? 'Average' : 'Total' }} {{ outputName }}</p>
    <div class="sortable-headers">
      <SortableTableHeaderCell
        :active-state="getHeaderCellSortState(SortOption.Name)"
        :label="'Region'"
        :up-label="'Sort from A-Z'"
        :down-label="'Sort from Z-A'"
        :is-small-text="true"
        @set-sort="(order) => setSortColumnAndOrder(SortOption.Name, order)"
      />
      <SortableTableHeaderCell
        :active-state="getHeaderCellSortState(SortOption.Value)"
        :label="unit"
        :up-label="'Sort by highest'"
        :down-label="'Sort by lowest'"
        :is-dropdown-aligned-right="true"
        :is-small-text="true"
        @set-sort="(order) => setSortColumnAndOrder(SortOption.Value, order)"
      />
    </div>
    <div class="rows">
      <BarChartPanelRow
        v-for="(row, rowIndex) of rowsWithData"
        :key="rowIndex"
        :item-data="row"
        :max-visible-bar-value="maxVisibleBarValue"
        :min-visible-bar-value="minVisibleBarValue"
        @toggle-expanded="toggleExpanded(row.path)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import BarChartPanelRow from '@/components/drilldown-panel/bar-chart-panel-row.vue';
import _ from 'lodash';
import { BreakdownData } from '@/types/Datacubes';
import { toRefs, ref, computed } from '@vue/runtime-core';
import {
  SortOption,
  isStatefulDataNode,
  extractPossibleRows,
  findMaxVisibleBarValue,
  findMinVisibleBarValue,
  constructHierarchichalDataNodeTree,
  toggleIsStatefulDataNodeExpanded,
} from '@/utils/bar-chart-panel-util';
import { watch } from 'vue';
import SortableTableHeaderCell from '@/components/widgets/sortable-table-header-cell.vue';
import { AggregationOption, SortableTableHeaderState } from '@/types/Enums';
import { BreakdownState } from '@/types/Datacube';
import { getRegionIdsFromBreakdownState } from '@/utils/datacube-util';
import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';
import { RootStatefulDataNode, StatefulDataNode } from '@/types/BarChartPanel';

const props = defineProps<{
  aggregationLevel: number;
  rawData: BreakdownData | null;
  unit: string;
  breakdownState: BreakdownState;
  getColorFromTimeseriesId: (timeseriesId: string) => string;
  aggregationMethod: AggregationOption;
  outputName: string;
}>();
const { rawData, aggregationLevel, breakdownState, getColorFromTimeseriesId } = toRefs(props);

const selectedRegionIds = computed(() => getRegionIdsFromBreakdownState(breakdownState.value));

const columnToSortBy = ref<SortOption>(SortOption.Name);
const sortOrder = ref<SortableTableHeaderState.Up | SortableTableHeaderState.Down>(
  SortableTableHeaderState.Up
);
const setSortColumnAndOrder = (
  column: SortOption,
  direction: SortableTableHeaderState.Up | SortableTableHeaderState.Down
) => {
  columnToSortBy.value = column;
  sortOrder.value = direction;
};
const getHeaderCellSortState = (cell: SortOption) =>
  cell === columnToSortBy.value ? sortOrder.value : SortableTableHeaderState.None;
const statefulData = ref<RootStatefulDataNode | null>(null);
watch(
  [rawData, columnToSortBy, sortOrder, getColorFromTimeseriesId],
  () => {
    if (rawData.value === null) return;
    statefulData.value = constructHierarchichalDataNodeTree(
      ADMIN_LEVEL_KEYS,
      rawData.value,
      getColorFromTimeseriesId.value,
      columnToSortBy.value,
      sortOrder.value
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

const maxVisibleBarValue = computed(() =>
  statefulData.value === null
    ? 0
    : findMaxVisibleBarValue(
        statefulData.value,
        // + 1 because if aggregationLevel === 0, we need to go 1 level deeper than the root level.
        aggregationLevel.value + 1,
        selectedRegionIds.value
      )
);

const minVisibleBarValue = computed(() =>
  statefulData.value === null
    ? 0
    : findMinVisibleBarValue(
        statefulData.value,
        // + 1 because if aggregationLevel === 0, we need to go 1 level deeper than the root level.
        aggregationLevel.value + 1,
        selectedRegionIds.value
      )
);

const rowsWithData = computed(() => {
  if (_.isNil(statefulData.value)) return [];
  return extractPossibleRows(
    statefulData.value,
    [],
    aggregationLevel.value,
    selectedRegionIds.value,
    ADMIN_LEVEL_KEYS
  ).filter((row) => row.bars.length);
});

const toggleExpanded = (path: string[]) => {
  if (statefulData.value === null) return;
  toggleIsStatefulDataNodeExpanded(path, statefulData.value);
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

.bar-chart-panel-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.sortable-headers {
  display: flex;
  justify-content: space-between;
  margin-left: -10px;
  margin-right: -10px;

  & > * {
    left: 0;
  }
}

.rows {
  margin-left: -20px;
  & > * {
    margin-bottom: 6px;
  }
}
</style>
