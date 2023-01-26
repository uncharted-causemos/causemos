<template>
  <div class="neighbor-node-container">
    <header>
      {{ node.label }}
    </header>
    <div style="flex-grow: 1">
      <svg ref="chartRef"></svg>
    </div>
    <div class="arrow" :class="{ 'is-outgoing-arrow': isDriver }">
      <div class="arrow-head" :style="{ borderLeftColor: edgeColor }"></div>
      <div class="arrow-tail" :style="{ height: `${edgeStyle.strokeWidth}px` }">
        <div class="arrow-tail-segment" :style="{ background: edgeColor }"></div>
        <div
          v-if="edgeStyle.isDashed"
          class="arrow-tail-segment"
          :style="{ background: edgeColor }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, defineComponent, PropType } from 'vue';
import * as d3 from 'd3';
import { EdgeParameter, NodeParameter } from '@/types/CAG';
import { calcEdgeColor, scaleByWeight } from '@/utils/scales-util';
import { hasBackingEvidence } from '@/utils/graphs-util';
import renderHistoricalProjectionsChart from '@/charts/scenario-renderer';

const BASE_EDGE_WIDTH = 5;

export default defineComponent({
  name: 'NeighborNode',
  props: {
    node: {
      type: Object as PropType<NodeParameter>,
      required: true,
    },
    edge: {
      type: Object as PropType<EdgeParameter>,
      required: true,
    },
    isDriver: {
      type: Boolean,
      default: false,
    },
    neighborhoodChartData: {
      type: Object,
      default: () => {},
    },
    selectedScenarioId: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  watch: {
    selectedScenarioId() {
      this.refresh();
    },
  },
  setup(props) {
    const edgeColor = computed(() => calcEdgeColor(props.edge));
    const edgeStyle = computed(() => {
      return {
        isDashed: !hasBackingEvidence(props.edge),
        strokeWidth: scaleByWeight(BASE_EDGE_WIDTH, props.edge),
      };
    });

    const chartRef = ref<HTMLElement | null>(null);
    const nodeChartData = computed(() => {
      return props.neighborhoodChartData[props.node.concept];
    });

    return {
      edgeStyle,
      edgeColor,
      nodeChartData,
      chartRef,
    };
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      if (this.chartRef === null) return;
      const el = d3.select(this.chartRef);
      el.selectAll('*').remove();
      const renderOptions = {
        margin: {
          top: 3,
          bottom: 3,
          left: 3,
          right: 3,
        },
        // FIXME: auto detect dimensions
        viewport: {
          x1: 0,
          y1: 0,
          x2: 136,
          y2: 55,
        },
        width: 136,
        height: 55,
      };

      renderHistoricalProjectionsChart(el, this.nodeChartData, renderOptions, {
        selectedScenarioId: this.selectedScenarioId,
      });
    },
  },
});
</script>

<style lang="scss" scoped>
$arrow-width: 20px;
$overlap: calc($arrow-width / 4);
$border-width: 1px;

// TODO: copy graph styles more exactly
.neighbor-node-container {
  display: flex;
  flex-direction: column;
  height: 80px;
  width: 140px;
  border-radius: 3px;
  border: $border-width solid lightgray;
  position: relative;
}

header {
  padding: 1px 3px;
  border-radius: 2px 2px 0 0;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.arrow {
  position: absolute;
  top: 50%;
  // Make incoming arrowheads overlap the node slightly
  right: calc(100% - #{$overlap} + #{$border-width});
  width: 20px;
  height: 20px;
  transform: translateY(-50%);

  &.is-outgoing-arrow {
    right: auto;
    left: 100%;
    z-index: 2;
  }
}

// Great article explaining how to render triangles using <div>s
// https://css-tricks.com/snippets/css/css-triangle/
$arrow-head-width: 10px;
.arrow-head {
  width: 0;
  height: 0;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
  border-left: $arrow-head-width solid transparent;
  border-right: 0px solid transparent;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

$arrow-tail-overlap: 2.5px;
.arrow-tail {
  width: calc(100% - #{$arrow-head-width} + #{$arrow-tail-overlap});
  height: 5px;
  position: absolute;
  left: -$arrow-tail-overlap;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 2px;
}

.arrow-tail-segment {
  flex: 1;
  min-width: 0;
}
</style>
