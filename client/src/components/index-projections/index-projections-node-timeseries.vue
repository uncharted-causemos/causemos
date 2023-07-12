<template>
  <div class="index-projections-node-timeseries-container">
    <svg ref="chartRef"></svg>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { computed, ref, toRefs, watch } from 'vue';
import renderChart from '@/charts/projections-renderer-simple';
import { ProjectionTimeseries } from '@/types/Timeseries';
import { timeseriesExtrema } from '@/utils/timeseries-util';

const props = defineProps<{
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  timeseries: ProjectionTimeseries[];
  showDataOutsideNorm: boolean;
  isWeightedSumNode: boolean;
  isInverted: boolean;
}>();

const {
  projectionStartTimestamp,
  projectionEndTimestamp,
  timeseries,
  isWeightedSumNode,
  isInverted,
  showDataOutsideNorm,
} = toRefs(props);
const chartRef = ref<HTMLElement | null>(null);

const GRAPH_HEIGHT_DEFAULT = 60; // normally a property of the parent, not available when we switch to variable height
const expandedHeight = computed(() => {
  const { globalMaxY, globalMinY } = timeseriesExtrema(timeseries.value);

  const minY = globalMinY > 0 ? 0 : globalMinY; // don't allow a minY to exceed 0
  const height = Math.ceil(((globalMaxY < 1 ? 1 : globalMaxY) - minY) * GRAPH_HEIGHT_DEFAULT); // don't allow maxY to fall beneath 1

  return height;
});

watch(
  [
    projectionStartTimestamp,
    projectionEndTimestamp,
    timeseries,
    chartRef,
    isWeightedSumNode,
    showDataOutsideNorm,
    expandedHeight,
  ],
  () => {
    const parentElement = chartRef.value?.parentElement;
    const svg = chartRef.value ? d3.select<HTMLElement, null>(chartRef.value) : null;
    if (parentElement === null || parentElement === undefined || svg === null) {
      return;
    }
    const { clientWidth: width } = parentElement;
    // Set new size
    svg.attr('width', width);
    svg.attr('height', showDataOutsideNorm.value ? expandedHeight.value : GRAPH_HEIGHT_DEFAULT);

    // Rerender whenever dependencies change
    renderChart(
      svg,
      timeseries.value,
      width,
      showDataOutsideNorm.value ? expandedHeight.value : GRAPH_HEIGHT_DEFAULT,
      projectionStartTimestamp.value,
      projectionEndTimestamp.value,
      isWeightedSumNode.value,
      isInverted.value,
      showDataOutsideNorm.value
    );
  }
);
</script>

<style lang="scss" scoped></style>
