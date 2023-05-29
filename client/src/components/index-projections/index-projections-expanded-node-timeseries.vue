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
import { TimeseriesPointProjected } from '@/types/Timeseries';

const props = defineProps<{
  projectionStartTimestamp: number;
  projectionEndTimestamp: number;
  timeseries: TimeseriesPointProjected[];
  isWeightedSumNode: boolean;
}>();

const { projectionStartTimestamp, projectionEndTimestamp, timeseries, isWeightedSumNode } =
  toRefs(props);
const chartRef = ref<HTMLElement | null>(null);
const onChartClick = (timestamp: number, value: number) => {
  // TODO: depending on state, modify constraints or historical data, or do nothing.
  console.log(timestamp, value);
};

watch(
  [projectionStartTimestamp, projectionEndTimestamp, chartRef, timeseries, isWeightedSumNode],
  () => {
    const parentElement = chartRef.value?.parentElement;
    const svg = chartRef.value ? d3.select<HTMLElement, null>(chartRef.value) : null;
    if (parentElement === null || parentElement === undefined || svg === null) {
      return;
    }
    const { clientWidth: width, clientHeight: height } = parentElement;
    // Set new size
    svg.attr('width', width).attr('height', height);

    // TODO: replace testData with real timeseries
    const testData = [
      {
        id: 'real data',
        name: 'real data',
        color: 'black',
        points: timeseries.value,
      },
      {
        id: 'fake data data',
        name: 'fake data data',
        color: 'blue',
        points: timeseries.value.map((point) => ({
          ...point,
          value: Math.random() * 0.3 + 0.3,
        })),
      },
    ];
    renderChart(
      svg,
      testData,
      width,
      height,
      projectionStartTimestamp.value,
      projectionEndTimestamp.value,
      isWeightedSumNode.value,
      onChartClick
    );
  }
);
</script>

<style lang="scss" scoped></style>
