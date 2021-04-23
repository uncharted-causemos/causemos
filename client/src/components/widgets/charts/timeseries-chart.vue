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
  emits: ['select-timestamp'],
  props: {
    timeseriesData: {
      type: Array as PropType<Timeseries[]>,
      required: true
    },
    selectedTimestamp: {
      type: Number,
      default: 0
    }
  },
  setup(props, { emit }) {
    const lineChart = ref<HTMLElement | null>(null);
    function selectTimestamp(newValue: number) {
      emit('select-timestamp', newValue);
    }
    let updateTimestampElements:
      | ((timestamp: number | null) => void)
      | undefined;
    const resize = _.debounce(function({ width, height }) {
      if (lineChart.value === null || props.timeseriesData.length === 0) return;
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
        props.selectedTimestamp,
        selectTimestamp
      );
    }, RESIZE_DELAY);
    function selectLastTimestamp() {
      const allTimestamps = props.timeseriesData
        .map(timeseries => timeseries.points)
        .flat()
        .map(point => point.timestamp);
      const lastTimestamp = _.max(allTimestamps);
      selectTimestamp(lastTimestamp ?? 0);
    }
    watch(
      () => props.selectedTimestamp,
      selectedTimestamp => {
        if (updateTimestampElements !== undefined) {
          updateTimestampElements(selectedTimestamp);
        }
      }
    );
    watch(
      () => props.timeseriesData,
      () => {
        // Underlying data has changed, so rerender chart
        const parentElement = lineChart.value?.parentElement;
        if (parentElement === null || parentElement === undefined) return;
        resize({
          width: parentElement.clientWidth,
          height: parentElement.clientHeight
        });
        selectLastTimestamp();
      }
    );
    onMounted(() => {
      const parentElement = lineChart.value?.parentElement;
      if (parentElement === null || parentElement === undefined) return;
      resize({
        width: parentElement.clientWidth,
        height: parentElement.clientHeight
      });
      selectLastTimestamp();
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
