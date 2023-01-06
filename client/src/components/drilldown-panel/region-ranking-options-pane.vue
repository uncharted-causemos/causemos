<template>
  <div class="breakdown-pane-container">
    <h5>By {{ aggregationLevelTitle }}</h5>
    <div v-if="aggregationLevelCount > 1" class="aggregation-level-range-container">
      <input
        type="range"
        class="aggregation-level-range"
        :value="aggregationLevel"
        :min="0"
        :max="aggregationLevelCount - 1"
        @input="onRangeValueChanged"
      />
      <div
        v-for="tickIndex in aggregationLevelCount"
        :key="tickIndex"
        class="aggregation-level-tick"
        :class="{ hidden: tickIndex - 1 === aggregationLevel }"
        :style="tickStyle(tickIndex)"
        @click="changeAggregationLevel(tickIndex - 1)"
      />
    </div>
    <div class="config-sub-group">
      <label class="header-secondary">Color Options</label>
      <label>Number of Color bins: {{ numberOfColorBins }}</label>
      <input
        type="range"
        style="margin-bottom: 1rem"
        min="2"
        :max="7"
        step="1"
        ref="number-of-color-bins-slider"
        :value="numberOfColorBins"
        @change="updateNumberOfColorBins"
      />
      <svg ref="colorPalette" />
    </div>

    <div class="config-sub-group">
      <label class="header-secondary">Binning Options:</label>
      <dropdown-button
        class="dropdown-button"
        :is-dropdown-left-aligned="true"
        :items="binningOptionsGroupButtons"
        :selected-item="regionRankingBinningType"
        @item-selected="setRegionRankingBinningType"
      />
    </div>
    <div class="config-sub-group">
      <label class="header-secondary">Composition Type:</label>
      <dropdown-button
        class="dropdown-button"
        :is-dropdown-left-aligned="true"
        :items="regionRankingCompositionTypeGroupButtons"
        :selected-item="regionRankingCompositionType"
        @item-selected="setRegionRankingCompositionType"
      />
    </div>
    <div class="config-sub-group">
      <label class="header-secondary">Ranking Criteria Relative Weight:</label>
      <button type="button" class="btn dropdown-button" @click="setEqualWeights">
        Equal Weights
      </button>
      <tag-slider
        :sections="regionRankingWeights"
        @update-sizes="$emit('region-ranking-weights-updated', $event)"
      />
    </div>
    <div class="config-sub-group">
      <div class="checkbox">
        <label @click="updateLimitNumberOfChartBars">
          <i
            class="fa fa-lg fa-fw"
            :class="{
              'fa-check-square-o': limitNumberOfChartBars,
              'fa-square-o': !limitNumberOfChartBars,
            }"
          />
          <span class="header-secondary limit-number-of-bars">Limit number of bars</span>
        </label>
      </div>
      <div v-if="limitNumberOfChartBars" style="margin-left: 2rem">
        <label class="header-secondary">Max Number:</label>
        <input
          type="number"
          style="margin-bottom: 1rem; margin-left: 5px"
          min="1"
          max="50"
          :value="maxNumberOfChartBars"
          @input="updateMaxNumberOfChartBars"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { COLOR_PALETTE_SIZE, COLOR_SCHEME, isDiscreteScale } from '@/utils/colors-util';
import { defineComponent, PropType, ref } from 'vue';
import DropdownButton from '@/components/dropdown-button.vue';
import * as d3 from 'd3';
import { BinningOptions, RegionRankingCompositionType } from '@/types/Enums';
import TagSlider from '@/components/widgets/multi-thumb-slider/tag-slider.vue';
import { capitalize } from '@/utils/string-util';

export default defineComponent({
  components: {
    DropdownButton,
    TagSlider,
  },
  name: 'RegionRankingOptionsPane',
  props: {
    aggregationLevelTitle: {
      type: String,
      default: '[Aggregation Level Title]',
    },
    aggregationLevelCount: {
      type: Number,
      default: 1,
    },
    aggregationLevel: {
      type: Number,
      default: 0,
      validator: (value: number) => {
        return value >= 0;
      },
    },
    numberOfColorBins: {
      type: Number,
      default: 5,
    },
    selectedColorScheme: {
      type: Array as PropType<string[]>,
      default: COLOR_SCHEME.PRIORITIZATION,
    },
    regionRankingCompositionType: {
      type: String,
      default: RegionRankingCompositionType.Union,
    },
    regionRankingBinningType: {
      type: String,
      default: BinningOptions.Linear,
    },
    maxNumberOfChartBars: {
      type: Number,
      default: 20,
    },
    limitNumberOfChartBars: {
      type: Boolean,
      default: false,
    },
    regionRankingWeights: {
      type: Array as PropType<{ itemId: string; name: string; weight: number }[]>,
      default: () => ({}),
    },
  },
  emits: [
    'set-selected-admin-level',
    'set-number-color-bins',
    'set-region-ranking-composition-type',
    'set-region-ranking-equal-weight',
    'set-max-number-of-chart-bars',
    'set-limit-number-of-chart-bars',
    'set-region-ranking-binning-type',
    'region-ranking-weights-updated',
  ],
  setup() {
    const regionRankingCompositionTypeGroupButtons = ref(
      Object.values(RegionRankingCompositionType).map((val) => ({
        displayName: capitalize(val),
        value: val,
      }))
    );
    const binningOptionsGroupButtons = ref(
      Object.values(BinningOptions).map((val) => ({ displayName: capitalize(val), value: val }))
    );

    return {
      binningOptionsGroupButtons,
      regionRankingCompositionTypeGroupButtons,
      isDiscreteScale,
      RegionRankingCompositionType,
    };
  },
  watch: {
    numberOfColorBins() {
      this.renderColorScale();
    },
    selectedColorScheme() {
      this.renderColorScale();
    },
  },
  mounted() {
    this.renderColorScale();
  },
  methods: {
    onRangeValueChanged(event: any) {
      this.changeAggregationLevel(event.target.valueAsNumber);
    },
    changeAggregationLevel(newLevel: number) {
      this.$emit('set-selected-admin-level', newLevel);
    },
    tickStyle(tickIndex: number) {
      const TICK_WIDTH = 8; // px
      // Tick indices are in 1..aggregationLevelCount.
      // Adjust both to be 0-indexed
      const cleanedIndex = tickIndex - 1;
      const cleanedCount = this.aggregationLevelCount - 1;
      // Space out each tick horizontally
      const percentage = cleanedIndex / cleanedCount;
      // Adjust each tick to the left so that the last one isn't overflowing
      const errorCorrect = percentage * TICK_WIDTH;
      return { left: `calc(${percentage * 100}% - ${errorCorrect}px)` };
    },
    updateNumberOfColorBins() {
      const newVal = parseFloat(
        (this.$refs['number-of-color-bins-slider'] as HTMLInputElement).value
      );
      this.$emit('set-number-color-bins', newVal);
    },
    renderColorScale() {
      const colors = this.selectedColorScheme;
      const n = colors.length;
      const refSelection = d3.select((this.$refs as any).colorPalette);
      refSelection.selectAll('*').remove();
      refSelection
        .attr('viewBox', '0 0 ' + n + ' 1')
        .attr('preserveAspectRatio', 'none')
        .style('display', 'block')
        .style('width', COLOR_PALETTE_SIZE + 'px')
        .style('height', '25px');
      refSelection
        .selectAll('rect')
        .data(colors)
        .enter()
        .append('rect')
        .style('fill', function (d) {
          return d;
        })
        .attr('x', function (d, i) {
          return i;
        })
        .attr('width', 1)
        .attr('height', 1);
    },
    setRegionRankingCompositionType(regionRankingCompositionType: RegionRankingCompositionType) {
      this.$emit('set-region-ranking-composition-type', regionRankingCompositionType);
    },
    setRegionRankingBinningType(regionRankingBinningType: string) {
      this.$emit('set-region-ranking-binning-type', regionRankingBinningType);
    },
    setEqualWeights() {
      this.$emit('set-region-ranking-equal-weight');
    },
    updateMaxNumberOfChartBars(event: any) {
      const newVal = parseFloat(event.target.value);
      if (isNaN(newVal) || newVal < 0) return;
      this.$emit('set-max-number-of-chart-bars', newVal);
    },
    updateLimitNumberOfChartBars() {
      this.$emit('set-limit-number-of-chart-bars');
    },
  },
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

$un-color-surface-30: #b3b4b5;

$track-height: 2px;
$thumb-size: 16px;
$tick-size: 8px;

h5 {
  margin: 0;
  margin-bottom: 5px;
}

.breakdown-pane-container {
  margin-bottom: 40px;
}

.aggregation-level-range-container {
  position: relative;
  margin: 15px 0;
}

.aggregation-level-range {
  margin-top: 10px;

  &::-webkit-slider-runnable-track {
    background: $un-color-surface-30;
    height: $track-height;
  }

  &::-webkit-slider-thumb {
    margin-top: -1 * ($thumb-size - $track-height) / 2;
  }
}

.aggregation-level-tick {
  width: $tick-size;
  height: $tick-size;
  border: 2px solid $un-color-surface-30;
  background-color: $background-light-1;
  border-radius: 50%;
  position: absolute;
  top: -1 * ($tick-size - $track-height) / 2;
  cursor: pointer;
}

.config-sub-group {
  display: flex;
  flex-direction: column;
  margin-top: 20px;

  > *:not(:first-child) {
    margin-top: 5px;
  }
}

.header-secondary {
  @include header-secondary;
  margin: 0;
}

.dropdown-button {
  width: max-content;
  padding: 4px 8px;
}

.checkbox {
  user-select: none; /* Standard syntax */
  display: inline-block;
  margin: 0;
  padding: 0;
  label {
    font-weight: normal;
    margin: 0;
    padding: 0;
    cursor: auto;
    color: gray;
  }
}

.limit-number-of-bars {
  cursor: pointer;
  font-weight: bold;
}
</style>
