<template>
  <div class="index-projections-expanded-node-timeseries-container">
    <svg ref="chartRef"></svg>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { computed, ref, toRefs, watch } from 'vue';
import renderChart from '@/charts/projections-renderer';
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

const emit = defineEmits<{
  (e: 'click-chart', timestamp: number, value: number): void;
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
const onChartClick = (timestamp: number, value: number) => {
  // Only allow a "click" if data point is within normalized range
  if (value >= 0 && value <= 1) {
    emit('click-chart', timestamp, props.isInverted ? 1 - value : value);
  }
};

const GRAPH_HEIGHT_DEFAULT = 160; // normally a property of the parent, not available when we switch to variable height
const expandedHeight = computed(() => {
  const { globalMaxY, globalMinY } = timeseriesExtrema(timeseries.value);

  const minY = globalMinY > 0 ? 0 : globalMinY; // don't allow a minY to exceed 0
  const height = Math.ceil(((globalMaxY < 1 ? 1 : globalMaxY) - minY) * GRAPH_HEIGHT_DEFAULT);
  return {
    height,
    start: minY,
  };
});

watch(
  [
    projectionStartTimestamp,
    projectionEndTimestamp,
    chartRef,
    timeseries,
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
    svg
      .attr('width', width)
      .attr(
        'height',
        showDataOutsideNorm.value ? expandedHeight.value.height : GRAPH_HEIGHT_DEFAULT
      );

    renderChart(
      svg,
      timeseries.value,
      width,
      showDataOutsideNorm.value ? expandedHeight.value.height : GRAPH_HEIGHT_DEFAULT,
      projectionStartTimestamp.value,
      projectionEndTimestamp.value,
      isWeightedSumNode.value,
      onChartClick,
      isInverted.value,
      showDataOutsideNorm.value,
      showDataOutsideNorm.value ? expandedHeight.value.start : 0
    );
  }
);
</script>

<style lang="scss" scoped></style>
