<template>
  <div class="aggregation-checklist-bar" :class="{'wrapped': wrapped}" :style="histogramMarginStyle(barValue)">
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
  name: 'aggregation-checklist-bar',
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
    },
    wrapped: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    totalBarLength(): number {
      return this.maxVisibleBarValue - this.minVisibleBarValue;
    },
    maxBarLength(): number {
      return Math.max(this.maxVisibleBarValue, -this.minVisibleBarValue);
    }
  },
  methods: {
    calculateWidth(value: number) {
      return this.minVisibleBarValue < 0
        ? (value / this.maxBarLength) * 100 / 2
        : (value / this.totalBarLength) * 100;
    },
    histogramMarginStyle(value: number) {
      if (value < 0) {
        const marginLeft = `${this.calculateWidth(value + this.maxBarLength)}%`;
        return { 'margin-left': marginLeft };
      } else {
        const marginLeft = `${this.minVisibleBarValue < 0 ? 50 : 0}%`;
        return { 'margin-left': marginLeft };
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

.wrapped .histogram-bar {
  top: 50%;
  transform: translateY(-50%);
}

.aggregation-checklist-bar {
  width: 100%;
  display: flex;
  flex-direction: row;
  span.faded {
    opacity: 50%;
  }
  .histogram-bar {
    position: relative;
    left: 0;
    width: 100%;
    height: 4px;
    background: #8767c8;
  }
  &.faded {
    opacity: 25%;
  }
}

</style>
