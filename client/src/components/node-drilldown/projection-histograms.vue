<template>
  <div class="projection-histograms-container">
    <h4 class="x-axis-label">Projected value</h4>
    <div class="grid-row slice-labels">
      <!-- TODO: for each timeslice -->
      <h3>In a few months</h3>
      <h3>In about a year</h3>
      <h3>In a few years</h3>
    </div>
    <!-- TODO: for each scenario -->
    <div class="grid-row scenario-row">
      <h3>Baseline</h3>
      <histogram :bin-values="{ base: [10, 80, 10, 0, 0], change: null }" />
      <histogram :bin-values="{ base: [30, 70, 0, 0, 0], change: null }" />
      <histogram :bin-values="{ base: [70, 20, 10, 0, 0], change: null }" />
    </div>
    <div class="grid-row scenario-row">
      <h3>Scenario 1</h3>
      <histogram :bin-values="{ base: [80, 10, 10, 0, 0], change: null }" />
      <histogram :bin-values="{ base: [10, 50, 20, 20, 0], change: null }" />
      <histogram :bin-values="{ base: [0, 20, 20, 50, 10], change: null }" />
    </div>
    <div class="grid-row scenario-row">
      <h3>Scenario 2</h3>
      <histogram :bin-values="{ base: [0, 60, 20, 20, 0], change: null }" />
      <histogram :bin-values="{ base: [20, 40, 20, 20, 0], change: null }" />
      <histogram :bin-values="{ base: [60, 20, 120, 8, 10], change: null }" />
    </div>
  </div>
</template>

<script lang="ts">
import { ScenarioProjection } from '@/types/CAG';
import { TimeseriesPoint } from '@/types/Timeseries';
import { defineComponent, PropType } from 'vue';
import Histogram from '@/components/widgets/charts/histogram.vue';

export default defineComponent({
  components: { Histogram },
  name: 'ProjectionHistograms',
  props: {
    comparisonBaselineId: {
      type: String,
      default: null
    },
    historicalTimeseries: {
      type: Array as PropType<TimeseriesPoint[]>,
      default: []
    },
    projections: {
      type: Array as PropType<ScenarioProjection[]>,
      default: []
    }
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.projection-histograms-container {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.x-axis-label {
  @include header-secondary;
  // There is 1 half width column and 3 full-width columns
  //  We want to align with the first full column, so add a left margin of 1/7th
  margin-left: calc(100% / 7);
}

h3,
h4 {
  margin: 0;
}

h3 {
  font-size: $font-size-large;
}

.grid-row {
  display: flex;
  align-items: center;
  & > * {
    flex: 2;
    min-width: 0;
  }
}

.slice-labels {
  // Add empty column at the left to align first label with first histogram.
  &::before {
    display: block;
    content: '';
    flex: 1;
    min-width: 0;
  }
  h3 {
    color: $label-color;
  }
  margin-bottom: 20px;
}

.scenario-row {
  padding: 30px 0 10px;
  h3 {
    // Give this column half of the space
    flex: 1;
    // Histogram component has 20px of bottom whitespace when not hovered, so
    //  nudge scenario name up by half of that to make it look more centered.
    position: relative;
    bottom: 10px;
  }

  &:not(:last-child) {
    border-bottom: 1px solid lightgray;
  }
}
</style>
