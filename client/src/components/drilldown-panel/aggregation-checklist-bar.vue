<template>
  <div
    class="aggregation-checklist-bar"
    :class="{ 'is-wrapped': isWrapped }"
    :style="histogramContainerStyle(barValue)"
  >
    <div
      class="zero-tick"
      v-if="isSelectedAggregationLevel && minVisibleBarValue < 0 && barValue >= 0"
    />
    <div
      v-if="isSelectedAggregationLevel"
      class="histogram-bar"
      :class="{ faded: !isChecked }"
      :style="histogramBarStyle(barValue, barColor)"
    />
    <div
      class="zero-tick"
      v-if="isSelectedAggregationLevel && minVisibleBarValue < 0 && barValue < 0"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/runtime-core';

export default defineComponent({
  name: 'aggregation-checklist-bar',
  props: {
    barColor: {
      type: String,
      required: true,
    },
    barValue: {
      type: Number,
      required: true,
    },
    isChecked: {
      type: Boolean,
      required: true,
    },
    isSelectedAggregationLevel: {
      type: Boolean,
      required: true,
    },
    maxVisibleBarValue: {
      type: Number,
      default: 0,
    },
    minVisibleBarValue: {
      type: Number,
      default: 0,
    },
    isWrapped: {
      type: Boolean,
      required: true,
    },
  },
  methods: {
    histogramContainerStyle(value: number) {
      if (value < 0) {
        // Bar extends from the center(50%) to partway through the left half
        return {
          'padding-right': '50%',
          'justify-content': 'flex-end',
        };
      }
      // `value` is positive
      // If there are negative values, bar extends fom the center(50%) to partway through the right half
      // Otherwise bar extends from the left(0%) to partway through the entire length
      return {
        'padding-left': `${this.minVisibleBarValue < 0 ? 50 : 0}%`,
        'justify-content': 'flex-start',
      };
    },
    histogramBarStyle(value: number, color: string) {
      const lengthOfLongestVisibleBar = Math.max(this.maxVisibleBarValue, -this.minVisibleBarValue);
      const fractionOfLongestVisibleBar = Math.abs(value) / lengthOfLongestVisibleBar;
      // Note that when padding-left or -right is 50%, CSS treats the bar width percentage
      //  calculated below as "X% of the remaining 50% (non-padding) space".
      return { width: `${fractionOfLongestVisibleBar * 100}%`, background: color };
    },
  },
});
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
$bar-height-half: 2px;
.is-wrapped {
  top: 50%;
  transform: translateY(-$bar-height-half);
  position: relative;
}

.aggregation-checklist-bar {
  width: 100%;
  display: flex;
  flex-direction: row;
  background: $un-color-black-5;
  align-items: center;
  span.faded {
    opacity: 50%;
  }
  .histogram-bar {
    position: relative;
    left: 0;
    width: 100%;
    height: $bar-height-half * 2;
    background: #8767c8;
  }
  &.faded {
    opacity: 25%;
  }
}

.zero-tick {
  background: $subdued;
  height: calc(100% + 2px);
  width: 1px;
}
</style>
