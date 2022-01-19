<template>
  <div class="ridgeline-container">
    <svg ref="renderTarget"></svg>
    <resize-observer @notify="resize" />
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';

import { renderRidgelines } from '@/charts/ridgeline-renderer';
import { RidgelinePoint } from '@/utils/ridgeline-util';
import {
  defineComponent,
  onMounted,
  PropType,
  ref,
  toRefs,
  watchEffect
} from 'vue';
import { nextTick } from 'process';

const RESIZE_DELAY = 15;

export default defineComponent({
  name: 'Histogram',
  props: {
    ridgelineData: {
      type: Object as PropType<RidgelinePoint[]>,
      required: true
    },
    // TODO:
    // comparisonBaseline: {
    //   type: Object as PropType<RidgelinePoint[] | null>,
    //   default: null
    // },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const { ridgelineData, min, max } = toRefs(props);

    const renderTarget = ref<SVGElement | null>(null);

    const chartSize = ref({ width: 0, height: 0 });
    onMounted(() => {
      // Set initial chart size
      const parentElement = renderTarget.value?.parentElement;
      if (parentElement === null || parentElement === undefined) {
        return;
      }
      // Seems to be a Vue reactivity bug: effect doesn't trigger
      //  unless chartSize is set next frame, likely because it has
      //  already run this frame before onMounted.
      nextTick(() => {
        chartSize.value = {
          width: parentElement.clientWidth,
          height: parentElement.clientHeight
        };
      });
    });

    watchEffect(() => {
      // Rerender whenever dependencies change
      const svg = renderTarget.value
        ? d3.selectAll<SVGElement, any>([renderTarget.value])
        : null;
      const { width, height } = chartSize.value;
      if (svg === null) {
        return;
      }
      // Set new size
      svg.attr('width', width).attr('height', height);
      svg.selectAll('*').remove();
      // Render one ridgeline for each timeslice
      renderRidgelines(
        svg,
        ridgelineData.value,
        width,
        height,
        min.value,
        max.value,
        true
      );
    });

    const resize = _.debounce(function({ width, height }) {
      if (renderTarget.value === null) return;
      chartSize.value = { width, height };
    }, RESIZE_DELAY);

    return {
      renderTarget,
      resize
    };
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.ridgeline-container {
  position: relative;
}
</style>
