<template>
  <div class="index-projections-expanded-node-timeseries-container">
    <svg ref="chartRef"></svg>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';
import { ref, toRefs, watch } from 'vue';
import renderChart from '@/charts/projections-renderer';
import { TimeseriesPoint } from '@/types/Timeseries';

const props = defineProps<{
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  timeseries: TimeseriesPoint[];
}>();

const { projectionStartTimestamp, projectionEndTimestamp, timeseries } = toRefs(props);
const chartRef = ref<HTMLElement | null>(null);

watch([projectionStartTimestamp, projectionEndTimestamp, chartRef, timeseries], () => {
  const parentElement = chartRef.value?.parentElement;
  const svg = chartRef.value ? d3.select<HTMLElement, null>(chartRef.value) : null;
  if (parentElement === null || parentElement === undefined || svg === null) {
    return;
  }
  const { clientWidth: width, clientHeight: height } = parentElement;
  // Set new size
  svg.attr('width', width).attr('height', height);
  renderChart(
    svg,
    timeseries.value,
    width,
    height,
    projectionStartTimestamp.value,
    projectionEndTimestamp.value
  );
});
</script>

<style lang="scss" scoped></style>