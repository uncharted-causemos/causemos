<template>
  <div class="histogram-container">
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
        :class="
          baseValue === maxValue || relativeToSummary?.messagePosition === index
            ? 'emphasized'
            : ''
        "
      >
        <span v-if="!isRelativeToActive">
          <span class="bin-label">{{ BIN_LABELS[index] }}</span>
          {{ index === 2 ? 'from' : 'than' }} now
        </span>
        <span v-else>
          <span v-if="relativeToSummary.messagePosition === index">
            {{ relativeToSummaryMessage.before }}
            <strong>{{ relativeToSummaryMessage.emphasized }}</strong>
            {{ relativeToSummaryMessage.after }}
          </span>
          <span v-else />
        </span>
      </span>
      <histogram-arrow
        v-if="relativeToSummary && relativeToSummary.arrow1"
        :arrow="relativeToSummary.arrow1"
        class="histogram-arrow"
      />
      <histogram-arrow
        v-if="relativeToSummary && relativeToSummary.arrow2"
        :arrow="relativeToSummary.arrow2"
        class="histogram-arrow"
      />
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
import { summarizeRelativeChange } from '@/utils/histogram-util';
import HistogramArrow from './histogram-arrow.vue';

type FiveNumbers = [number, number, number, number, number];

interface BinValues {
  base: FiveNumbers;
  change: FiveNumbers | null;
}

const BIN_LABELS = [
  'Much higher',
  'Higher',
  'Negligible change',
  'Lower',
  'Much lower'
];
const MAGNITUDE_ADJECTIVES = ['', 'small', '', 'large', 'extreme'];

export default defineComponent({
  components: { HistogramArrow },
  name: 'Histogram',
  props: {
    binValues: {
      type: Object as PropType<BinValues>,
      required: true
    }
  },
  setup(props) {
    const { binValues } = toRefs(props);

    const isRelativeToActive = computed(() => binValues.value.change !== null);

    const relativeToSummary = computed(() => {
      if (!isRelativeToActive.value) return null;
      // RelativeTo is active, so we can safely assert that changes array is
      //  not null
      return summarizeRelativeChange(binValues.value.change as FiveNumbers);
    });

    const relativeToSummaryMessage = computed(() => {
      const summary = relativeToSummary.value;
      if (summary === null) return { before: '', emphasized: '', after: '' };
      const { arrow1, messagePosition, arrow2 } = summary;
      if (arrow1 === null) {
        return { before: 'No change.', emphasized: '', after: '' };
      }
      if (arrow2 !== null) {
        // Either more or less certain
        const isMoreCertain = arrow2.to === messagePosition;
        const emphasized = (isMoreCertain ? 'More' : 'Less') + ' certain';
        return { before: '', emphasized, after: ' values.' };
      }
      const magnitudeOfChange = Math.abs(arrow1.to - arrow1.from);
      const magnitudeAdjective = MAGNITUDE_ADJECTIVES[magnitudeOfChange];
      const directionOfChange = arrow1.to < arrow1.from ? 'higher' : 'lower';
      return {
        before: _.capitalize(`${magnitudeAdjective} shift toward `.trim()),
        emphasized: directionOfChange,
        after: ' values.'
      };
    });

    return {
      isRelativeToActive,
      relativeToSummary,
      maxValue: computed(() => _.max(binValues.value.base)),
      BIN_LABELS,
      relativeToSummaryMessage
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
  // Leave space for x axis label
  padding-bottom: 2 * $axis-line-height;
  position: relative;

  .value-column,
  .summary,
  .x-axis-label {
    transition: opacity 0.1s ease-out, transform 0.1s ease-out;
  }

  cursor: pointer;
  &:hover {
    .value-column,
    .summary,
    .x-axis-label {
      transition: opacity 0.3s ease-out, transform 0.3s ease-out;
      opacity: 1;
      transform: translate(0, 0);
    }

    .bar,
    .bar::after,
    .histogram-arrow {
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

    &:not(:first-child):not(.histogram-arrow) {
      margin-top: 2px;
    }
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
      animation: histogram-bar-reduce 2s linear backwards 1;
    }
  }

  &.increased {
    background: #4dac26;
    transform-origin: left;
    animation: histogram-bar-increase 2s linear backwards 1;
  }
}

.value-column {
  margin-left: 5px;
  font-size: $font-size-medium;
  width: 4ch;
  text-align: right;

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
  width: 300px;
  margin-left: 10px;
  position: relative;
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
  left: 0;
  bottom: 0;
  line-height: $axis-line-height;
  opacity: 0;
  transform: translate(0, -3px);
}
</style>
