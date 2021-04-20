<template>
  <div class="timeseries-chart-container">
    <svg ref="lineChart" />
    <resize-observer @notify="resize" />
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';
import renderTimeseries from '@/charts/timeseries-renderer';
import { Timeseries } from '@/types/Timeseries';
import { defineComponent, PropType, onMounted, ref, watch } from 'vue';

const RESIZE_DELAY = 15;

export default defineComponent({
  name: 'TimeseriesChart',
  props: {
    timeseriesData: {
      type: Array as PropType<Timeseries[]>,
      required: true
    }
  },
  setup(props) {
    const lineChart = ref<HTMLElement | null>(null);
    const selectedTimestamp = ref(0);
    const selectTimestamp = (newValue: number) => {
      selectedTimestamp.value = newValue;
    };
    let updateTimestampElements: ((timestamp: number | null) => void) | undefined;
    const resize = _.debounce(function({ width, height }) {
      if (lineChart.value === null) return;
      const svg = d3.select<HTMLElement, null>(lineChart.value);
      if (svg === null) return;
      // Set new size
      svg.attr('width', width).attr('height', height);
      // (Re-)render
      svg.selectAll('*').remove();
      updateTimestampElements = renderTimeseries(
        svg,
        props.timeseriesData,
        width,
        height,
        selectedTimestamp.value,
        selectTimestamp
      );
    }, RESIZE_DELAY);
    watch(selectedTimestamp, selectedTimestamp => {
      if (updateTimestampElements !== undefined) {
        updateTimestampElements(selectedTimestamp);
      }
    });
    onMounted(() => {
      const parentElement = lineChart.value?.parentElement;
      if (parentElement === null || parentElement === undefined) return;
      resize({
        width: parentElement.clientWidth,
        height: parentElement.clientHeight
      });
      const allTimestamps = props.timeseriesData
        .map(timeseries => timeseries.points)
        .flat()
        .map(point => point.timestamp);
      const lastTimestamp = _.max(allTimestamps);
      selectTimestamp(lastTimestamp ?? 0);
    });
    return { resize, lineChart };
  }
});
</script>

<style lang="scss" scoped>
.timeseries-chart-container {
  position: relative;
  width: 100%;
  height: 140px;
}

::v-deep(.xAxis .domain) {
  stroke: #e3e4e6;
}

::v-deep(.yAxis .tick line) {
  stroke: #e3e4e6;
}

::v-deep(.yAxis .domain) {
  opacity: 0;
}

::v-deep(.segment-line) {
  opacity: 0.5;
  stroke-width: 2;
}
</style>
