<template>
  <div class="index-results-dataset-weights-container">
    <header>
      <h4>Datasets weights</h4>
      <p class="de-emphasized">with respect to {{ 'Overall Priority' }}</p>
    </header>
    <div class="list-items">
      <div v-for="item of listItems" :key="item.dataset.id" class="list-item">
        <i
          class="fa fa-fw"
          :style="{ color: getIndexNodeTypeColor(IndexNodeType.Dataset) }"
          :class="[getIndexNodeTypeIcon(IndexNodeType.Dataset)]"
        />
        <span class="name">{{ item.dataset.name }}</span>
        <span class="de-emphasized">{{ precisionFormatter(item.overallWeight) }}%</span>
        <BatteryIndicator
          :total-bar-count="TOTAL_BATTERY_INDICATOR_BAR_COUNT"
          :active-bar-count="getBarCount(item.overallWeight)"
          class="battery-indicator"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import useIndexTree from '@/services/composables/useIndexTree';
import {
  calculateOverallWeight,
  findAllDatasets,
  getIndexNodeTypeColor,
  getIndexNodeTypeIcon,
} from '@/utils/index-tree-util';
import { computed } from 'vue';
import { IndexNodeType } from '@/types/Enums';
import BatteryIndicator from '../widgets/battery-indicator.vue';
import precisionFormatter from '@/formatters/precision-formatter';

const { tree } = useIndexTree();

const TOTAL_BATTERY_INDICATOR_BAR_COUNT = 5;
/**
 * Scales the provided weight to the range [0, TOTAL_BATTERY_INDICATOR_BAR_COUNT]
 * @param weight A number from 0 to 100.
 */
const getBarCount = (weight: number) => {
  // Determine what percentage each bar represents
  const increment = 100 / TOTAL_BATTERY_INDICATOR_BAR_COUNT;
  // Round weight to the nearest bar
  return Math.round(weight / increment);
};

const listItems = computed(() => {
  const datasets = findAllDatasets(tree.value);
  const unsortedResults = datasets.map((dataset) => ({
    dataset,
    overallWeight: calculateOverallWeight(tree.value, dataset),
  }));
  // Sort descending, by weight
  return _.sortBy(unsortedResults, (item) => -item.overallWeight);
});
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';
.index-results-dataset-weights-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.de-emphasized {
  color: $un-color-black-40;
}

.list-item {
  display: flex;
  padding: 5px 0;
  align-items: center;
  gap: 5px;
}

.name {
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.battery-indicator {
  width: 28px;
  height: 10px;
}
</style>
