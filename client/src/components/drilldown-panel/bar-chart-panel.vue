<template>
  <div class="bar-chart-panel-container">
    <!-- This (redundant) summary is hidden if split by region is active -->
    <TimestampSummary
      v-if="!isBreakdownStateRegions(breakdownState)"
      :aggregationMethod="props.aggregationMethod"
      :unit="props.unit"
      :timeseriesData="props.timeseriesData"
      :breakdown-state="breakdownState"
      :selected-timestamp="props.selectedTimestamp"
    />
    <hr v-if="!isBreakdownStateRegions(breakdownState)" />
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
import { ADMIN_LEVEL_KEYS } from '@/utils/admin-level-util';
import { RootStatefulDataNode, StatefulDataNode } from '@/types/BarChartPanel';
import { BreakdownState } from '@/types/Datacube';
import { isBreakdownStateRegions } from '@/utils/datacube-util';
import TimestampSummary from './timestamp-summary.vue';
import { Timeseries } from '@/types/Timeseries';

const props = defineProps<{
  aggregationLevel: number;
  rawData: BreakdownData | null;
  unit: string;
  getColorFromTimeseriesId: (timeseriesId: string) => string;
  aggregationMethod: AggregationOption;
  breakdownState: BreakdownState;
  timeseriesData: Timeseries[];
  selectedTimestamp: number | null;
}>();
const { rawData, aggregationLevel, getColorFromTimeseriesId, breakdownState } = toRefs(props);

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

const getNameFromTimeseriesId = (timeseriesId: string): string => {
  const timeseries = props.timeseriesData.find((ts) => ts.id === timeseriesId);
  return timeseries ? timeseries.name : '';
};

watch(
  [
    rawData,
    columnToSortBy,
    sortOrder,
    getColorFromTimeseriesId,
    () => breakdownState.value.comparisonSettings,
  ],
  ([_rawData, _columnToSortBy, _sortOrder, _getColorFromTimeseriesId, _comparisonSettings]) => {
    if (_rawData === null) return;
    statefulData.value = constructHierarchichalDataNodeTree(
      ADMIN_LEVEL_KEYS,
      _rawData,
      _getColorFromTimeseriesId,
      getNameFromTimeseriesId,
      _columnToSortBy,
      _sortOrder,
      _comparisonSettings
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
        aggregationLevel.value + 1
      )
);

const minVisibleBarValue = computed(() =>
  statefulData.value === null
    ? 0
    : findMinVisibleBarValue(
        statefulData.value,
        // + 1 because if aggregationLevel === 0, we need to go 1 level deeper than the root level.
        aggregationLevel.value + 1
      )
);

const rowsWithData = computed(() => {
  if (_.isNil(statefulData.value)) return [];
  return extractPossibleRows(
    statefulData.value,
    [],
    aggregationLevel.value,
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

h5 {
  margin: 0;
  margin-bottom: 5px;
}

.bar-chart-panel-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 20px;
  overflow-y: auto;

  & > hr {
    margin-block: 15px;
    border-width: 0;
    border-top: 1px solid var(--p-surface-200);
  }
}

.sortable-headers {
  display: flex;
  justify-content: space-between;
  margin-left: -10px;
  margin-right: -10px;
  margin-top: 10px;

  & > * {
    left: 0;
  }
}

.rows {
  margin-left: -20px;
  & > * {
    margin-bottom: 8px;
  }
}
</style>
