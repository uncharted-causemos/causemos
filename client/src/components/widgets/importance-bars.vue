<template>
  <div
    v-tooltip.top="tooltipInfo"
    class="importance"
    :class="{ 'not-available': !importance }"
  >
    <div
      v-for="index in numBars"
      :key="index"
      :class="{ active: index <= numActive }"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';

// Labels associated with confidences for tooltips
const TOOLTIP_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

export default defineComponent({
  name: 'ImportanceBars',

  props: {
    importance: {
      type: Number as PropType<number>,
      default: null
    },

    label: {
      type: String as PropType<string>,
      default: 'importance'
    },
    max: {
      type: Number as PropType<number>,
      default: 1
    },
    // Number of bars in the display
    numBars: {
      type: Number as PropType<number>,
      default: 10
    }
  },

  computed: {
    // importance / range = importance ratio for other computeds
    importanceRatio(): number|null {
      if (this.importance === null) return null;
      return this.importance / this.max;
    },

    // Threshold to display a bar active
    numActive(): number {
      if (this.importanceRatio === null) return -1;
      return Math.round(this.importanceRatio * this.numBars);
    },
    tooltipInfo(): string|null {
      if (this.importanceRatio) {
        const level = TOOLTIP_LEVELS[
          Math.min(
            Math.round(this.importanceRatio * (TOOLTIP_LEVELS.length - 1)),
            TOOLTIP_LEVELS.length - 1
          )
        ];
        return `${level} estimated ${this.label}`;
      } else {
        return null;
      }
    }
  }
});
</script>

<style lang="scss" scoped>
.importance {
  position: relative;
  display: inline-flex;
  height: 10px;
  line-height: 10px;
  align-self: center;
  div {
    background-color: lightgray;
    border-radius: 2px;
    height: 10px;
    margin-left: 1px;
    width: 3px;
  }
  div.active {
    background-color: black;
  }
  .not-available::after {
    background-color: lightgray;
    border-top: 2px solid white;
    content: "\0A";
    height: 4px;
    position: absolute;
    transform: rotate(45deg) translate(10%, 100%);
    width: 100%;
  }
}
</style>
