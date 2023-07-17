<template>
  <div class="index-projections-expanded-node-timeseries-container">
    <svg ref="chartRef"></svg>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { ref, toRefs, watch } from 'vue';
import renderChart, {
  Y_AXIS_WIDTH,
  PADDING_TOP,
  SCROLL_BAR_HEIGHT,
  SCROLL_BAR_TOP_MARGIN,
  X_AXIS_HEIGHT,
} from '@/charts/projections-renderer';
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

const calculateSvgHeight = (svgWidth: number, showDataOutsideNorm: boolean) => {
  // Calculate the height of the main chart area (when only showing the 0 to 1 range) based on
  //  its width
  const chartWidth = svgWidth - Y_AXIS_WIDTH;
  const defaultChartHeight = (1 / 4) * chartWidth;
  const heightOutsideChart =
    PADDING_TOP + SCROLL_BAR_HEIGHT + SCROLL_BAR_TOP_MARGIN + X_AXIS_HEIGHT;
  if (!showDataOutsideNorm) {
    return defaultChartHeight + heightOutsideChart;
  }

  // Calculate the height of the main chart area (when showing values outside 0 to 1) by scaling
  //  the default chart height
  const { globalMaxY, globalMinY } = timeseriesExtrema(timeseries.value);
  // Ensure that the minimum Y value is always 0 or lower
  const minY = globalMinY > 0 ? 0 : globalMinY;
  // Ensure that the maximum Y value is always 1 or higher
  const totalY = (globalMaxY < 1 ? 1 : globalMaxY) - minY;
  const chartHeight = Math.ceil(totalY * defaultChartHeight);
  return chartHeight + heightOutsideChart;
};

watch(
  [
    projectionStartTimestamp,
    projectionEndTimestamp,
    chartRef,
    timeseries,
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
    svg.attr('width', width).attr('height', svgHeight);

    renderChart(
      svg,
      timeseries.value,
      width,
      svgHeight,
      projectionStartTimestamp.value,
      projectionEndTimestamp.value,
      isWeightedSumNode.value,
      onChartClick,
      isInverted.value,
      showDataOutsideNorm.value
    );
  }
);
</script>

<style lang="scss" scoped></style>
