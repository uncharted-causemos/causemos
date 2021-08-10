<template>
  <div class="timeseries-chart-container">
    <svg ref="lineChart" />
    <resize-observer @notify="resize" />
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';
import renderTimeline from '@/charts/timeline-renderer';
import { Timeseries } from '@/types/Timeseries';
import { defineComponent, PropType, onMounted, ref, watch, toRefs } from 'vue';

const RESIZE_DELAY = 15;

export default defineComponent({
  name: 'TimelineChart',
  emits: ['select-timestamp', 'select-timestamp-range'],
  props: {
    timeseriesData: {
      type: Array as PropType<Timeseries[]>,
      required: true
    },
    selectedTimestamp: {
      type: Number,
      default: 0
    },
    breakdownOption: {
      type: String as PropType<string | null>,
      default: null
    }
  },
  setup(props, { emit }) {
    const { timeseriesData, breakdownOption, selectedTimestamp } = toRefs(
      props
    );
    const lineChart = ref<HTMLElement | null>(null);
    function selectTimestamp(newValue: number) {
      emit('select-timestamp', newValue);
    }
    function selectTimestampRange(timestamp1: number, timestamp2: number) {
      emit('select-timestamp-range', { timestamp1, timestamp2 });
    }
    let updateTimestampElements:
      | ((timestamp: number | null) => void)
      | undefined;
    const resize = _.debounce(function({ width, height }) {
      if (lineChart.value === null || timeseriesData.value.length === 0) return;
      const svg = d3.select<HTMLElement, null>(lineChart.value);
      if (svg === null) return;
      // Set new size
      svg.attr('width', width).attr('height', height);
      // (Re-)render
      svg.selectAll('*').remove();
      updateTimestampElements = renderTimeline(
        svg,
        timeseriesData.value,
        width,
        height,
        selectedTimestamp.value,
        breakdownOption.value,
        selectTimestamp,
        selectTimestampRange
      );
    }, RESIZE_DELAY);
    watch(
      () => selectedTimestamp.value,
      selectedTimestamp => {
        if (updateTimestampElements !== undefined) {
          updateTimestampElements(selectedTimestamp);
        }
      }
    );
    watch(
      () => [timeseriesData.value, breakdownOption.value],
      () => {
        // Underlying data has changed, so rerender chart
        const parentElement = lineChart.value?.parentElement;
        if (parentElement === null || parentElement === undefined) return;
        resize({
          width: parentElement.clientWidth,
          height: parentElement.clientHeight
        });
      }
    );
    onMounted(() => {
      const parentElement = lineChart.value?.parentElement;
      if (parentElement === null || parentElement === undefined) return;
      resize({
        width: parentElement.clientWidth,
        height: parentElement.clientHeight
      });
    });
    return { resize, lineChart };
  }
});
</script>

<style lang="scss" scoped>
.timeseries-chart-container {
  position: relative;
  width: 100%;
  height: 100px;
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
