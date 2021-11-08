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

const findFarthestBinIndex = (binIndices: number[], targetBinIndex: number) => {
  let farthestBin = binIndices[0];
  binIndices.forEach(currentBin => {
    if (Math.abs(currentBin - targetBinIndex) > farthestBin - targetBinIndex) {
      farthestBin = currentBin;
    }
  });
  return farthestBin;
};

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

    const isRelativeToActive = computed(() => binValues.value.change !== null);

    const relativeToSummary = computed(() => {
      if (!isRelativeToActive.value) return null;
      // RelativeTo is active, so changes array is not null
      const changes = binValues.value.change as FiveNumbers;
      // ASSUMPTION: total losses should equal total gains in magnitude
      const greatestLoss = _.min(changes) ?? 0;
      if (greatestLoss >= 0) {
        return {
          arrow1: null,
          binsBetweenLossAndGain: 0,
          messagePosition: 2,
          arrow2: null
        };
      }
      const greatestGain = _.max(changes) ?? 0;
      const binsWithGreatestLoss: number[] = [];
      const binsWithGreatestGain: number[] = [];
      changes.forEach((change, binIndex) => {
        if (change === greatestLoss) {
          binsWithGreatestLoss.push(binIndex);
        } else if (change === greatestGain) {
          binsWithGreatestGain.push(binIndex);
        }
      });
      const isMultipleMinBins = binsWithGreatestLoss.length !== 1;
      const isMultipleMaxBins = binsWithGreatestGain.length !== 1;
      // Determine which arrows and text to show depending on the
      //  number of bins that contain the min and max values
      if (!isMultipleMinBins && !isMultipleMaxBins) {
        // If there's only one min and max, arrow from min to max
        const minBin = binsWithGreatestLoss[0];
        const maxBin = binsWithGreatestGain[0];
        return {
          arrow1: { from: minBin, to: maxBin },
          binsBetweenLossAndGain: Math.abs(maxBin - minBin),
          messagePosition: maxBin,
          arrow2: null
        };
      } else if (!isMultipleMinBins && isMultipleMaxBins) {
        // If there's one min and multiple maxes
        const minBin = binsWithGreatestLoss[0];
        // FIXME: confusing that higher bins have lower indices
        const maxBinsAboveMinBin = binsWithGreatestGain.filter(
          maxBin => maxBin < minBin
        );
        const maxBinsBelowMinBin = binsWithGreatestGain.filter(
          maxBin => maxBin > minBin
        );
        if (
          maxBinsAboveMinBin.length === 0 ||
          maxBinsBelowMinBin.length === 0
        ) {
          //  if all maxes are in one direction from min, arrow from min to farthest max
          const farthestMax = findFarthestBinIndex(
            binsWithGreatestGain,
            minBin
          );
          return {
            arrow1: { from: minBin, to: farthestMax },
            binsBetweenLossAndGain: Math.abs(farthestMax - minBin),
            messagePosition: farthestMax,
            arrow2: null
          };
        } else {
          //  if they're on both sides, arrows from min to farthest max in each direction
          const farthestAbove = findFarthestBinIndex(
            maxBinsAboveMinBin,
            minBin
          );
          const farthestBelow = findFarthestBinIndex(
            maxBinsBelowMinBin,
            minBin
          );
          return {
            arrow1: { from: minBin, to: farthestAbove },
            binsBetweenLossAndGain: Math.abs(farthestAbove - minBin),
            messagePosition: minBin,
            arrow2: { from: minBin, to: farthestBelow }
          };
        }
      } else if (isMultipleMinBins && !isMultipleMaxBins) {
        // If there are multiple mins and one max
        // FIXME: confusing that higher bins have lower indices
        const maxBin = binsWithGreatestGain[0];
        const minBinsAboveMaxBin = binsWithGreatestLoss.filter(
          minBin => minBin < maxBin
        );
        const minBinsBelowMaxBin = binsWithGreatestLoss.filter(
          minBin => minBin > maxBin
        );
        if (
          minBinsAboveMaxBin.length === 0 ||
          minBinsBelowMaxBin.length === 0
        ) {
          //  if all mins are in one direction from max, arrow from farthest min to max
          const farthestMin = findFarthestBinIndex(
            binsWithGreatestLoss,
            maxBin
          );
          return {
            arrow1: { from: farthestMin, to: maxBin },
            binsBetweenLossAndGain: Math.abs(farthestMin - maxBin),
            messagePosition: maxBin,
            arrow2: null
          };
        } else {
          //  if they're on both sides, arrows from farthest mins in each direction to max
          const farthestAbove = findFarthestBinIndex(
            minBinsAboveMaxBin,
            maxBin
          );
          const farthestBelow = findFarthestBinIndex(
            minBinsBelowMaxBin,
            maxBin
          );
          return {
            arrow1: { from: farthestAbove, to: maxBin },
            binsBetweenLossAndGain: Math.abs(farthestAbove - maxBin),
            messagePosition: maxBin,
            arrow2: { from: farthestBelow, to: maxBin }
          };
        }
      } else {
        // If there are multiple mins and multiple maxes
        //  This is an edge case with many possible sub-cases that each would
        //  ideally have their own custom logic. Instead, use this simple rule
        //  that works reasonably well for all sub-cases:
        // Calculate the average bin index for the maxes, and the average
        //  bin index for the mins.
        const meanMaxValueBinIndex = _.mean(binsWithGreatestGain);
        const meanMinValueBinIndex = _.mean(binsWithGreatestLoss);
        const difference = Math.ceil(
          meanMaxValueBinIndex - meanMinValueBinIndex
        );
        // Message goes in the center regardless
        if (difference === 0) {
          // No shift higher or lower, it's either more or less precise
          //  so draw two arrows
          const isMorePrecise =
            (_.min(binsWithGreatestLoss) ?? 0) <
            (_.min(binsWithGreatestGain) ?? 0);
          if (isMorePrecise) {
            return {
              arrow1: { from: 1, to: 2 },
              binsBetweenLossAndGain: difference,
              messagePosition: 2,
              arrow2: { from: 3, to: 2 }
            };
          }
          return {
            arrow1: { from: 2, to: 1 },
            binsBetweenLossAndGain: difference,
            messagePosition: 2,
            arrow2: { from: 2, to: 1 }
          };
        }
        // Draw one arrow from the center towards the mean max bin index
        return {
          arrow1: { from: 2, to: 2 + difference },
          binsBetweenLossAndGain: difference,
          messagePosition: 2,
          arrow2: null
        };
      }
    });

    return {
      isRelativeToActive,
      relativeToSummary,
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

    .bar,
    .bar::after {
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
