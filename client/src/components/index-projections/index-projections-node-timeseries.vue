<template>
  <div class="index-projections-node-timeseries-container">
    <span class="range-max">{{ rangeFormatter(chartRange.max) }}</span>
    <span class="range-min">{{ rangeFormatter(chartRange.min) }}</span>
    <span class="domain-min">{{ timestampFormatter(projectionStartTimestamp, null, null) }}</span>
    <span class="domain-max">{{ timestampFormatter(projectionEndTimestamp, null, null) }}</span>
    <svg ref="chartRef" class="chart"></svg>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { computed, ref, toRefs, watch } from 'vue';
import renderChart from '@/charts/projections-renderer-simple';
import { ProjectionTimeseries } from '@/types/Timeseries';
import { timeseriesExtrema } from '@/utils/timeseries-util';
import timestampFormatter from '@/formatters/timestamp-formatter';

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

const chartRange = computed(() => {
  const { globalMaxY, globalMinY } = timeseriesExtrema(timeseries.value);
  // Ensure that the minimum Y value is always 0 or lower
  const min = globalMinY > 0 ? 0 : globalMinY;
  // Ensure that the maximum Y value is always 1 or higher
  const max = globalMaxY < 1 ? 1 : globalMaxY;
  if (showDataOutsideNorm.value) {
    return { min, max };
  }
  return { min: 0, max: 1 };
});

const rangeFormatter = (number: number) =>
  number === 0 || number === 1 ? number : number.toFixed(1);

const calculateSvgHeight = (svgWidth: number, showDataOutsideNorm: boolean) => {
  // Calculate the height of the main chart area (when only showing the 0 to 1 range) based on
  //  its width
  const defaultChartHeight = (1 / 4) * svgWidth;
  if (!showDataOutsideNorm) {
    return defaultChartHeight;
  }

  // Calculate the height of the main chart area (when showing values outside 0 to 1) by scaling
  //  the default chart height
  const totalY = chartRange.value.max - chartRange.value.min;
  const chartHeight = Math.ceil(totalY * defaultChartHeight);
  return chartHeight;
};

watch(
  [
    projectionStartTimestamp,
    projectionEndTimestamp,
    timeseries,
    chartRef,
    isWeightedSumNode,
    showDataOutsideNorm,
  ],
  () => {
    const parentElement = chartRef.value?.parentElement;
    const svg = chartRef.value ? d3.select<HTMLElement, null>(chartRef.value) : null;
    if (parentElement === null || parentElement === undefined || svg === null) {
      return;
    }
    const { clientWidth: width } = parentElement;

    const svgHeight = calculateSvgHeight(width, showDataOutsideNorm.value);
    // Set new size
    svg.attr('width', width);
    svg.attr('height', svgHeight);

    // Rerender whenever dependencies change
    renderChart(
      svg,
      timeseries.value,
      width,
      svgHeight,
      projectionStartTimestamp.value,
      projectionEndTimestamp.value,
      isWeightedSumNode.value,
      isInverted.value,
      showDataOutsideNorm.value
    );
  }
);
</script>

<style scoped>
.index-projections-node-timeseries-container {
  --padding: 1rem;
  padding: var(--padding);
  position: relative;

  &:hover {
    .chart {
      border-left-color: var(--p-surface-200);
      border-bottom-color: var(--p-surface-200);
      transition: border-color 250ms ease-out;
    }

    .range-max,
    .range-min,
    .domain-min,
    .domain-max {
      opacity: 1;
      transition: opacity 250ms ease-out;
    }
  }
}

.chart {
  border: 1px solid transparent;
}

.range-max,
.range-min,
.domain-min,
.domain-max {
  opacity: 0;
  position: absolute;
  line-height: var(--padding);
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.range-max,
.range-min {
  min-width: var(--padding);
  text-align: center;
  background: white;
}

.range-max {
  top: calc(0.5 * var(--padding));
  left: 0;
}
.range-min {
  bottom: calc(0.5 * var(--padding));
  left: 0;
}

.domain-min {
  top: calc(100% - var(--padding));
  left: var(--padding);
}
.domain-max {
  top: calc(100% - var(--padding));
  right: var(--padding);
}
</style>
