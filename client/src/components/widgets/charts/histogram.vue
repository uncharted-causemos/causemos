<template>
  <div class="histogram-container">
    <div class="column legend-column">
      <!-- TODO: -->
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
      <span v-for="(baseValue, index) in binValues.base" :key="index">
        <span
          v-if="!isRelativeToActive"
          class="summary"
          :class="baseValue === maxValue ? 'emphasized' : ''"
        >
          <span class="bin-label">{{ BIN_LABELS[index] }}</span>
          {{ index === 2 ? 'from' : 'than' }} now
        </span>
      </span>
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

<style lang="scss" scoped>
@import '@/styles/variables';

.histogram-container {
  display: flex;
  height: 100px;
  background: white;

  &:hover {
    .value-column {
      opacity: 1;
    }

    .summary {
      opacity: 1;
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
  }

  &.increased {
    background: #4dac26;
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

  &.emphasized {
    opacity: 1;
  }

  &.emphasized .bin-label {
    color: black;
    font-size: $font-size-large;
  }
}
</style>
