<template>
  <div class="graph-node-container">
    <header>
      {{ node.label }}
    </header>
    <div class="graph">
      <!-- TODO: draw a little chart here -->
      (Little chart goes here)
    </div>
    <svg
      class="arrow"
      :class="{ 'is-outgoing-arrow': isDriver }"
      :viewBox="MARKER_VIEWBOX"
    >
      <!-- TODO: show edge polarity and strength -->
      <line x1="-5" y1="0" x2="0" y2="0" :style="edgeStyle"/>
      <path :d="ARROW" :fill="edgeColor" stroke="none" />
    </svg>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from 'vue';
import { ARROW, MARKER_VIEWBOX } from '@/utils/svg-util';
import { EdgeParameter, NodeParameter } from '@/types/CAG';
import { calcEdgeColor, scaleByWeight } from '@/utils/scales-util';
import { hasBackingEvidence } from '@/utils/graphs-util';

const BASE_EDGE_WIDTH = 2;
const NO_EVIDENCE_DASH = '2, 1';

export default defineComponent({
  name: 'GraphNode',
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
    return {
      ARROW,
      MARKER_VIEWBOX,
      edgeStyle,
      edgeColor
    };
  }
});
</script>

<style lang="scss" scoped>
$arrow-width: 20px;
$overlap: $arrow-width / 4;
$border-width: 1px;

// TODO: copy graph styles more exactly
.graph-node-container {
  height: 80px;
  width: 140px;
  border-radius: 3px;
  border: $border-width solid lightgray;
  position: relative;
}

header {
  background: #eee;
  padding: 1px 3px;
  border-radius: 2px 2px 0 0;
}

.arrow {
  position: absolute;
  top: 50%;
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
