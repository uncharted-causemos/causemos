<template>
  <div class="neighbor-node-container">
    <header>
      {{ nodeLabelTruncated }}
    </header>
    <div style="flex-grow: 1">
      <svg ref="chartRef" />
    </div>
    <svg
      class="arrow"
      :class="{ 'is-outgoing-arrow': isDriver }"
      :viewBox="MARKER_VIEWBOX"
    >
      <line x1="-5" y1="0" x2="0" y2="0" :style="edgeStyle"/>
      <path :d="ARROW" :fill="edgeColor" stroke="none" />
    </svg>
  </div>
</template>

<script lang="ts">
import { ref, computed, defineComponent, PropType } from 'vue';
import * as d3 from 'd3';
import { ARROW, MARKER_VIEWBOX } from '@/utils/svg-util';
import stringUtil from '@/utils/string-util';
import { EdgeParameter, NodeParameter } from '@/types/CAG';
import { calcEdgeColor, scaleByWeight } from '@/utils/scales-util';
import { hasBackingEvidence } from '@/utils/graphs-util';
import renderHistoricalProjectionsChart from '@/charts/scenario-renderer';

const BASE_EDGE_WIDTH = 0.5;
const NO_EVIDENCE_DASH = '2, 1';

export default defineComponent({
  name: 'NeighborNode',
  props: {
    node: {
      type: Object as PropType<NodeParameter>,
      required: true
    },
    edge: {
      type: Object as PropType<EdgeParameter>,
      required: true
    },
    isDriver: {
      type: Boolean,
      default: false
    },
    neighborhoodChartData: {
      type: Object,
      default: () => {}
    },
    selectedScenarioId: {
      type: String as PropType<(string | null)>,
      default: null
    }
  },
  computed: {
    nodeLabelTruncated(): string {
      return stringUtil.truncateString(this.node.label, 20);
    }
  },
  watch: {
    selectedScenarioId() {
      this.refresh();
    }
  },
  setup(props) {
    const edgeColor = computed(() => calcEdgeColor(props.edge));
    const edgeStyle = computed(() => {
      return {
        stroke: edgeColor.value,
        strokeDasharray: hasBackingEvidence(props.edge) ? null : NO_EVIDENCE_DASH,
        strokeWidth: scaleByWeight(BASE_EDGE_WIDTH, props.edge)
      };
    });

    const chartRef = ref<HTMLElement | null>(null);
    const nodeChartData = computed(() => {
      return props.neighborhoodChartData[props.node.concept];
    });

    return {
      ARROW,
      MARKER_VIEWBOX,
      edgeStyle,
      edgeColor,
      nodeChartData,
      chartRef
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
          top: 3, bottom: 3, left: 3, right: 3
        },
        // FIXME: auto detect dimensions
        viewport: {
          x1: 0,
          y1: 0,
          x2: 136,
          y2: 55
        },
        width: 136,
        height: 55
      };

      renderHistoricalProjectionsChart(el, this.nodeChartData, renderOptions, {
        selectedScenarioId: this.selectedScenarioId
      });
    }
  }
});
</script>

<style lang="scss" scoped>
$arrow-width: 20px;
$overlap: $arrow-width / 4;
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
</style>
