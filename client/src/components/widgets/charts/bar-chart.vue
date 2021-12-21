<template>
  <div class="bar-chart-container">
    <div class="chart">
      <svg ref="barChart" />
      <resize-observer @notify="resize" />
    </div>
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';
import { renderBarChart, updateHover } from '@/charts/bar-chart-renderer';
import { BarData } from '@/types/BarChart';
import { defineComponent, PropType, onMounted, ref, watch, toRefs } from 'vue';
import { D3Selection } from '@/types/D3';

const RESIZE_DELAY = 15;

export default defineComponent({
  name: 'BarChart',
  emits: ['bar-chart-hover'],
  props: {
    barsData: {
      type: Array as PropType<BarData[]>,
      required: true
    },
    hoverInfo: {
      type: Object as PropType<{hoverId: string; isVisible: boolean}>,
      default: () => null
    }
  },
  setup(props, { emit }) {
    const {
      barsData,
      hoverInfo
    } = toRefs(props);
    const barChart = ref<HTMLElement | null>(null);
    const svg = ref<D3Selection | null>(null);
    const resize = _.debounce(function({ width, height }) {
      if (barChart.value === null || barsData.value.length === 0) return;
      svg.value = d3.select<HTMLElement, null>(barChart.value);
      if (svg.value === null) return;
      // Set new size
      svg.value.attr('width', width).attr('height', height);
      // (Re-)render
      svg.value.selectAll('*').remove();
      const onHover = (barLabel: string, isVisible: boolean) => {
        emit('bar-chart-hover', {
          hoverId: barLabel,
          isVisible: isVisible
        });
      };
      renderBarChart(
        svg.value,
        barsData.value,
        width,
        height,
        onHover
      );
    }, RESIZE_DELAY);
    watch(
      () => [
        barsData.value
      ],
      () => {
        // Underlying data has changed, so rerender chart
        const parentElement = barChart.value?.parentElement;
        if (parentElement === null || parentElement === undefined) return;
        resize({
          width: parentElement.clientWidth,
          height: parentElement.clientHeight
        });
      }
    );
    watch(
      () => [
        hoverInfo.value
      ],
      () => {
        if (svg.value === null || hoverInfo.value === null) {
          return;
        }
        updateHover(svg.value, hoverInfo.value.hoverId, hoverInfo.value.isVisible);
      }
    );
    onMounted(() => {
      const parentElement = barChart.value?.parentElement;
      if (parentElement === null || parentElement === undefined) return;
      resize({
        width: parentElement.clientWidth,
        height: parentElement.clientHeight
      });
    });
    return {
      resize,
      barChart
    };
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.bar-chart-container {
  width: 100%;
  height: 130px;
  display: flex;
}

.chart {
  flex: 1;
  min-width: 0;
  position: relative;
}

.selected-data {
  width: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
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
