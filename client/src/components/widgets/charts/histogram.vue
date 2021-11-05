<template>
  <div class="histogram-container">
    <div class="y-axis-column">
      <div class="arrow">↑</div>
      <span>Projected change from now</span>
      <div class="arrow">↓</div>
    </div>
    <div class="column bar-column">
      <div
        v-for="(baseValue, index) in binValues.base"
        :key="index"
        class="histogram-row"
      >
        <div class="bar default" :style="{ width: baseValue + '%' }" />
        <div
          v-if="isRelativeToActive"
          class="bar"
          :class="binValues.change[index] < 0 ? 'reduced' : 'increased'"
          :style="{ width: Math.abs(binValues.change[index]) + '%' }"
        />
      </div>
    </div>
    <div class="column value-column">
      <span v-for="(baseValue, index) in binValues.base" :key="index">
        <span v-if="!isRelativeToActive" class="value">
          {{ baseValue }}
        </span>
        <span
          v-else
          class="value"
          :class="{
            reduced: binValues.change[index] < 0,
            increased: binValues.change[index] > 0
          }"
        >
          {{
            (binValues.change[index] > 0 ? '+' : '') + binValues.change[index]
          }}
        </span>
      </span>
    </div>
    <div class="column summary-column">
      <span
        v-for="(baseValue, index) in binValues.base"
        :key="index"
        class="summary"
        :class="baseValue === maxValue ? 'emphasized' : ''"
      >
        <span v-if="!isRelativeToActive">
          <span class="bin-label">{{ BIN_LABELS[index] }}</span>
          {{ index === 2 ? 'from' : 'than' }} now
        </span>
      </span>
    </div>
    <div class="column x-axis-label">
      <span>→</span>
      <span># of trials in category</span>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, PropType, toRefs } from 'vue';

interface BinValues {
  base: [number, number, number, number, number];
  change: [number, number, number, number, number] | null;
}

const BIN_LABELS = [
  'Much higher',
  'Higher',
  'Negligible change',
  'Lower',
  'Much lower'
];

export default defineComponent({
  name: 'Histogram',
  props: {
    binValues: {
      type: Object as PropType<BinValues>,
      required: true
    }
  },
  setup(props) {
    const { binValues } = toRefs(props);
    return {
      isRelativeToActive: computed(() => binValues.value.change !== null),
      maxValue: computed(() => _.max(binValues.value.base)),
      BIN_LABELS
    };
  }
});
</script>

<style>

/*
There's currently a vue bug that keyframe animations don't work correctly
with scoped style blocks. Fix has been merged but not released (Nov 2021):
https://github.com/vuejs/vue-next/pull/3308

In the meantime, use very specific animation names in the global scope.
*/

@keyframes histogram-bar-reduce {
  0% {
    width: 100%;
  }
  25% {
    width: 0%;
  }
  100% {
    width: 0%;
  }
}


@keyframes histogram-bar-increase {
  0% {
    transform: scaleX(0);
  }
  25% {
    transform: scaleX(1);
  }
  100% {
    transform: scaleX(1);
  }
}

</style>

<style lang="scss" scoped>
@import '@/styles/variables';
$axis-line-height: $font-size-large;

.histogram-container {
  display: flex;
  height: calc(100px + #{2 * $axis-line-height});
  // TODO: remove
  background: white;
  // Leave space for x axis label
  padding-bottom: 2 * $axis-line-height;
  position: relative;

  .y-axis-column,
  .value-column,
  .summary,
  .x-axis-label {
    transition: opacity 0.1s ease-out, transform 0.1s ease-out;
  }

  cursor: pointer;
  &:hover {
    .y-axis-column,
    .value-column,
    .summary,
    .x-axis-label {
      transition: opacity 0.3s ease-out, transform 0.3s ease-out;
      opacity: 1;
      transform: translate(0, 0);
    }

    .bar, .bar::after {
      animation-iteration-count: infinite;
    }
  }
}

.column {
  display: flex;
  flex-direction: column;

  & > * {
    flex: 1;
    min-height: 0;

    &:not(:first-child) {
      margin-top: 2px;
    }
  }
}

$y-axis-width: 60px;
$y-axis-margin: 5px;

.y-axis-column {
  width: $y-axis-width;
  margin-right: $y-axis-margin;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  opacity: 0;
  transform: translate(10%, 0);

  .arrow {
    flex: 1;
    min-width: 0;
  }

  span {
    flex-shrink: 0;
    text-align: right;
    line-height: $axis-line-height;
  }
}

.bar-column {
  width: 50px;
}

.histogram-row {
  display: flex;
  background: #efefef;
  width: 50px;
}

.bar {
  &.default {
    background: #747576;
  }

  &.reduced {
    background: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 3px,
      #df85bd 3px,
      #df85bd 6px
    );
    position: relative;
    &::after {
      display: block;
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: #747576;
      animation: histogram-bar-reduce 2s linear backwards 0;
    }
  }

  &.increased {
    background: #4dac26;
    transform-origin: left;
    animation: histogram-bar-increase 2s linear backwards 0;
  }
}

.value-column {
  margin-left: 5px;
  font-size: $font-size-medium;
  width: 4ch;

  .increased {
    color: #4dac26;
  }

  .reduced {
    color: #d01c8b;
  }

  opacity: 0;
  transform: translate(-3px, 0);
}

.summary-column {
  border: 1px solid white;
  width: 200px;
  margin-left: 5px;
}

.summary {
  color: $label-color;
  line-height: $font-size-large;
  opacity: 0;
  transform: translate(-3px, 0);

  &.emphasized {
    opacity: 1;
    transform: translate(0);
  }

  &.emphasized .bin-label {
    color: black;
    font-size: $font-size-large;
  }
}

.x-axis-label {
  position: absolute;
  left: $y-axis-width + $y-axis-margin;
  bottom: 0;
  line-height: $axis-line-height;
  opacity: 0;
  transform: translate(0, -3px);
}
</style>
