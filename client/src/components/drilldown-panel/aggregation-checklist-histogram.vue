<template>
  <div :style="histogramMarginStyle(barValue)">
    <aggregation-checklist-rectangle v-if="isSelectedAggregationLevel && minVisibleBarValue < 0 && barValue >= 0"/>
    <div
      v-if="isSelectedAggregationLevel"
      class="histogram-bar"
      :class="{ faded: !isChecked }"
      :style="histogramBarStyle(barValue, barColor)"/>
    <aggregation-checklist-rectangle v-if="isSelectedAggregationLevel && minVisibleBarValue < 0 && barValue < 0"/>
  </div>
</template>

<script lang="ts">

import { defineComponent } from '@vue/runtime-core';
import AggregationChecklistRectangle from '@/components/drilldown-panel/aggregation-checklist-rectangle.vue';

export default defineComponent({
  name: 'aggregation-checklist-histogram',
  components: {
    AggregationChecklistRectangle
  },
  props: {
    barColor: {
      type: String,
      required: true
    },
    barValue: {
      type: Number,
      required: true
    },
    isChecked: {
      type: Boolean,
      required: true
    },
    isSelectedAggregationLevel: {
      type: Boolean,
      required: true
    },
    maxVisibleBarValue: {
      type: Number,
      default: 0
    },
    minVisibleBarValue: {
      type: Number,
      default: 0
    }
  },
  computed: {
    totalBarLength(): number {
      return this.maxVisibleBarValue - this.minVisibleBarValue;
    }
  },
  methods: {
    calculateWidth(value: number) {
      return (value / this.totalBarLength) * 100;
    },
    histogramMarginStyle(value: number) {
      const DEFAULT_WIDTH = '100%';
      const DEFAULT_DISPLAY = 'flex';
      const DEFAULT_DIRECTION = 'row';
      if (value < 0) {
        const marginLeft = `${this.calculateWidth(value - this.minVisibleBarValue)}%`;
        return { 'margin-left': marginLeft, 'width': DEFAULT_WIDTH, 'display': DEFAULT_DISPLAY, 'flex-direction': DEFAULT_DIRECTION };
      } else {
        const marginLeft = `${this.calculateWidth(-this.minVisibleBarValue)}%`;
        return { 'margin-left': marginLeft, 'width': DEFAULT_WIDTH, 'display': DEFAULT_DISPLAY, 'flex-direction': DEFAULT_DIRECTION };
      }
    },
    histogramBarStyle(value: number, color: string) {
      const percentage = this.calculateWidth(Math.abs(value));
      return { width: `${percentage}%`, background: color };
    }
  }
});

</script>

<style lang="scss" scoped>

span.faded {
  opacity: 50%;
}

.histogram-bar {
  position: relative;
  left: 0;
  width: 100%;
  height: 4px;
  background: #8767c8;

  &.faded {
    opacity: 25%;
  }
}

</style>
