<template>
  <div class="projection-histograms-container">
    <h4 class="x-axis-label">Change in value</h4>
    <div class="grid-row slice-labels">
      <h3 v-for="(timeSliceLabel, index) in timeSliceLabels" :key="index">
        {{ timeSliceLabel }}
      </h3>
    </div>
    <div
      v-for="(scenario, index) of projections"
      :key="scenario.scenarioId"
      class="grid-row scenario-row"
    >
      <h3>{{ scenario.scenarioName }}</h3>
      <histogram
        v-for="(histogramData, timeSliceIndex) of binnedResults[index]"
        :key="timeSliceIndex"
        :bin-values="{ base: histogramData, change: null }"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { CAGModelSummary, ScenarioProjection } from '@/types/CAG';
import { TimeseriesPoint } from '@/types/Timeseries';
import { defineComponent, PropType } from 'vue';
import Histogram from '@/components/widgets/charts/histogram.vue';
import {
  convertTimeseriesDistributionToHistograms,
  ProjectionHistograms
} from '@/utils/histogram-util';
import { TIME_SCALE_OPTIONS } from '@/utils/time-scale-util';
import _ from 'lodash';

export default defineComponent({
  components: { Histogram },
  name: 'ProjectionHistograms',
  props: {
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      required: true
    },
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
  },
  computed: {
    timeSliceLabels(): string[] {
      const timeScale = this.modelSummary.parameter.time_scale;
      const timeSlices = TIME_SCALE_OPTIONS.find(({ id }) => id === timeScale)
        ?.timeSlices;
      return (
        timeSlices?.map(({ label }) => _.capitalize(label)) ?? ['', '', '']
      );
    },
    binnedResults(): ProjectionHistograms[] {
      // Filter out the scenarios that haven't been run yet (typically just
      //  draft) and then convert all projection results into histograms
      return this.projections
        .filter(projection => projection.values.length > 0)
        .map(projection =>
          convertTimeseriesDistributionToHistograms(
            this.modelSummary,
            this.historicalTimeseries,
            null, // TODO: clampedNowValue
            projection.values
          )
        );
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
  font-size: $font-size-extra-large;
  font-weight: normal;
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
  padding-bottom: 10px;
  margin-bottom: 30px;
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
