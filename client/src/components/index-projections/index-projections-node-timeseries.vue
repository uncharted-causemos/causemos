<template>
  <div class="index-projections-node-timeseries-container">
    <svg ref="chartRef"></svg>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { ref, toRefs, watch } from 'vue';
import renderChart from '@/charts/projections-renderer-simple';
import { ProjectionTimeseries } from '@/types/Timeseries';

const props = defineProps<{
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  timeseries: ProjectionTimeseries[];
  isWeightedSumNode: boolean;
  isInverted: boolean;
}>();

const {
  projectionStartTimestamp,
  projectionEndTimestamp,
  timeseries,
  isWeightedSumNode,
  isInverted,
} = toRefs(props);
const chartRef = ref<HTMLElement | null>(null);

watch(
  [projectionStartTimestamp, projectionEndTimestamp, timeseries, chartRef, isWeightedSumNode],
  () => {
    const parentElement = chartRef.value?.parentElement;
    const svg = chartRef.value ? d3.select<HTMLElement, null>(chartRef.value) : null;
    if (parentElement === null || parentElement === undefined || svg === null) {
      return;
    }
    const { clientWidth: width, clientHeight: height } = parentElement;
    // Set new size
    svg.attr('width', width).attr('height', height);

    // Rerender whenever dependencies change
    renderChart(
      svg,
      timeseries.value,
      width,
      height,
      projectionStartTimestamp.value,
      projectionEndTimestamp.value,
      isWeightedSumNode.value,
      isInverted.value
    );
  }
);
</script>

<style lang="scss" scoped></style>
