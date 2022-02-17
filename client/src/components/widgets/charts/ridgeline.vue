<template>
  <div class="ridgeline-container">
    <svg ref="renderTarget"></svg>
    <resize-observer @notify="resize" />
  </div>
</template>

<script lang="ts">
import * as d3 from 'd3';
import _ from 'lodash';

import {
  RIDGELINE_VERTICAL_AXIS_WIDTH,
  COMPARISON_BASELINE_COLOR,
  renderRidgelines
} from '@/charts/ridgeline-renderer';
import { RidgelineWithMetadata } from '@/utils/ridgeline-util';
import {
  defineComponent,
  onMounted,
  PropType,
  ref,
  toRefs,
  watchEffect,
  nextTick
} from 'vue';
import { translate } from '@/utils/svg-util';

const RESIZE_DELAY = 15;

export default defineComponent({
  name: 'Ridgeline',
  props: {
    ridgelineData: {
      type: Object as PropType<RidgelineWithMetadata>,
      required: true
    },
    comparisonBaseline: {
      type: Object as PropType<RidgelineWithMetadata | null>,
      default: null
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 0
    },
    contextRange: {
      type: Object as PropType<{ min: number; max: number } | null>,
      default: null
    }
  },
  setup(props) {
    const { ridgelineData, comparisonBaseline, min, max, contextRange } =
      toRefs(props);

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
      if (svg === null || width === 0 || height === 0) {
        return;
      }
      // Set new size
      svg.attr('width', width).attr('height', height);
      svg.selectAll('*').remove();
      // Context ranges start `RIDGELINE_VERTICAL_AXIS_WIDTH` / 2 SVG units to
      //  the left of the `g` element that's created in `renderRidgelines`.
      // To keep it within this component's `svg` element, we
      //  - pass a smaller width to `renderRidgelines`
      //  - shift the resulting `g` element to the right
      const widthWithoutContextRanges =
        width - RIDGELINE_VERTICAL_AXIS_WIDTH / 2;

      renderRidgelines(
        svg,
        ridgelineData.value,
        comparisonBaseline.value,
        widthWithoutContextRanges,
        height,
        min.value,
        max.value,
        true,
        true,
        '',
        contextRange.value,
        10,
        COMPARISON_BASELINE_COLOR
      ).attr('transform', translate(RIDGELINE_VERTICAL_AXIS_WIDTH / 2, 0));
    });

    const resize = _.debounce(function ({ width, height }) {
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
