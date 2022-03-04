<template>
  <div class="bar-chart-container">
    <div class="chart">
      <div v-if="barsData.length === 0" class="no-data">No data available using selected criteria!</div>
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
    hoverId: {
      type: String,
      default: ''
    }
  },
  setup(props, { emit }) {
    const {
      barsData,
      hoverId
    } = toRefs(props);
    const barChart = ref<HTMLElement | null>(null);
    const svg = ref<D3Selection | null>(null);
    const initialHoverId = ref('');
    const resize = _.debounce(function({ width, height }) {
      if (barChart.value === null) return;

      svg.value = d3.select<HTMLElement, null>(barChart.value);
      if (svg.value === null) return;
      // Set new size
      svg.value.attr('width', width).attr('height', height);
      // (Re-)render
      svg.value.selectAll('*').remove();
      if (barsData.value.length === 0) {
        // clear rendering since, e.g. not bars resulted from the intersection of region ranking
        return;
      }
      const onHover = (barLabel: string) => {
        emit('bar-chart-hover', barLabel);
      };
      renderBarChart(
        svg.value as any,
        barsData.value,
        width,
        height,
        initialHoverId.value,
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
        hoverId.value
      ],
      () => {
        if (hoverId.value !== null) {
          // when applying an insight for example, hoverId may be valid but svg is not
          initialHoverId.value = hoverId.value;
        }
        if (svg.value === null || hoverId.value === null) {
          return;
        }
        updateHover(svg.value as any, hoverId.value);
      },
      { immediate: true }
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
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  position: relative;
}

.no-data {
  font-style: italic;
  width: 100%;
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
