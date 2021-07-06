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
      width="10"
      height="10"
      :viewBox="MARKER_VIEWBOX"
    >
      <!-- TODO: show edge polarity and strength -->
      <line x1="-3" y1="0" x2="0" y2="0" style="stroke: black; stroke-width: 2"/>
      <path :d="ARROW" fill="black" stroke="none" />
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { ARROW, MARKER_VIEWBOX } from '@/utils/svg-util';
import { EdgeParameter, NodeParameter } from '@/types/CAG';
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
  setup() {
    return {
      ARROW,
      MARKER_VIEWBOX
    };
  }
});
</script>

<style lang="scss" scoped>
// TODO: copy graph styles more exactly
.graph-node-container {
  height: 80px;
  width: 140px;
  border-radius: 3px;
  border: 1px solid lightgray;
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
  right: 100%;
  transform: translateY(-50%) scale(2);

  &.is-outgoing-arrow {
    right: auto;
    left: 100%;
    z-index: 2;
  }
}
</style>
