<template>
  <div class="projection-histograms-container">
    <div
      class="grid-row slice-labels x-axis-label"
      :class="{ 'left-aligned': !isScenarioComparisonActive }"
    >
      <h4>Change in value</h4>
    </div>
    <div class="grid-row slice-labels">
      <h3
        v-for="(timeSliceLabel, index) in timeSliceLabels"
        :key="index"
        :class="{ hidden: isHiddenTimeSlice(index) }"
      >
        <small-icon-button
          v-if="isScenarioComparisonActive && index !== 0"
          class="time-slice-arrow-button"
          @click="selectedTimeSliceIndex--"
        >
          <i class="fa fa-fw fa-caret-left" />
        </small-icon-button>
        {{ timeSliceLabel }}
        <small-icon-button
          v-if="
            isScenarioComparisonActive && index !== timeSliceLabels.length - 1
          "
          class="time-slice-arrow-button right"
          @click="selectedTimeSliceIndex++"
        >
          <i class="fa fa-fw fa-caret-right" />
        </small-icon-button>
      </h3>
    </div>
    <div
      v-for="row of rowsToDisplay"
      :key="row.scenarioId"
      class="grid-row scenario-row"
    >
      <h3>{{ row.scenarioName }}</h3>
      <histogram
        v-for="(histogramData, timeSliceIndex) of row.histograms"
        class="histogram"
        :class="{ hidden: isHiddenTimeSlice(timeSliceIndex) }"
        :key="timeSliceIndex"
        :bin-values="histogramData"
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
  HistogramData,
  ProjectionHistograms
} from '@/utils/histogram-util';
import { TIME_SCALE_OPTIONS_MAP } from '@/utils/time-scale-util';
import SmallIconButton from '@/components/widgets/small-icon-button.vue';

/**
 * `base`: these values represent the grey part of each histogram bar.
 * `change`: null means that 'relative to' comparison is not active.
 * Positive values will be drawn as green bars, negative values will be drawn
 * as striped magenta bars.
 *
 * Assumptions:
 * - the sum of `change` should be 0 whenever it isn't null
 * - the green and grey bars should add up to 100% of run values, since
 * combined they represent the total distribution of the run that is being
 * compared to the baseline
 */
export interface ComparisonHistogramData {
  base: HistogramData;
  change: HistogramData | null;
}

interface HistogramRow {
  scenarioName: string;
  scenarioId: string;
  histograms: ComparisonHistogramData[];
}

function compareHistograms(
  baseline: ProjectionHistograms,
  result: ProjectionHistograms
): ComparisonHistogramData[] {
  // For each histogram
  return result.map((histogramData, timeSliceIndex) => {
    const base: number[] = [];
    const change: number[] = [];
    // For each bar
    histogramData.forEach((barValue, barIndex) => {
      // Calculate the difference from the baseline value to the result value
      const baselineValue = baseline[timeSliceIndex][barIndex];
      const difference = barValue - baselineValue;
      // This entry in the "base" array will be the same as the result bar,
      //  but subtract any positive change. This is because the green
      //  "change" bar can be thought of as a part of scenario result, but the
      //  pink bar represents runs that are missing from the scenario result.
      base.push(barValue - (difference > 0 ? difference : 0));
      // This entry in the "change" array will be equal to the difference.
      change.push(difference);
    });
    // Assert that there are still 5 elements in each array
    return { base: base as HistogramData, change: change as HistogramData };
  });
}

export default defineComponent({
  components: { Histogram, SmallIconButton },
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
    },
    indicatorId: {
      type: String,
      default: null
    }
  },
  data: () => ({
    // Select middle time slice by default
    selectedTimeSliceIndex: 1
  }),
  computed: {
    isScenarioComparisonActive(): boolean {
      return this.comparisonBaselineId !== null;
    },
    timeSliceLabels(): string[] {
      const timeScale = this.modelSummary.parameter.time_scale;
      const timeSlices = TIME_SCALE_OPTIONS_MAP.get(timeScale)?.timeSlices;
      return timeSlices?.map(({ label }) => `In ${label}`) ?? ['', '', ''];
    },
    binnedResults(): ProjectionHistograms[] {
      // Filter out the scenarios that haven't been run yet (typically just
      //  draft) and then convert all projection results into histograms

      // Ensure we pass an empty array of historical data if no indicator is
      //  being used to ground this node, since we currently (Nov 2021)
      //  artificially add 3 points with a value of 0.5 to abstract nodes
      const isAbstractNode = this.indicatorId === null;
      return this.projections
        .filter(projection => projection.values.length > 0)
        .map(projection =>
          convertTimeseriesDistributionToHistograms(
            this.modelSummary.parameter.time_scale,
            isAbstractNode ? [] : this.historicalTimeseries,
            projection.values
          )
        );
    },
    rowsToDisplay(): HistogramRow[] {
      if (!this.isScenarioComparisonActive) {
        return this.projections.map((projection, index) => ({
          scenarioName: projection.scenarioName,
          scenarioId: projection.scenarioId,
          histograms: this.binnedResults[index].map(histogramData => ({
            base: histogramData,
            change: null
          }))
        }));
      }
      // Scenario comparison is active.
      // Display the comparison baseline scenario first
      // Note that the "comparison baseline scenario" may not be the scenario
      //  without clamps (also referred to as the "baseline scenario")
      const baselineIndex = this.projections.findIndex(
        ({ scenarioId }) => scenarioId === this.comparisonBaselineId
      );
      if (baselineIndex === -1) {
        console.error(
          'Unable to find projection data for scenario ' +
            this.comparisonBaselineId
        );
        return [];
      }
      const baselineScenario = this.projections[baselineIndex];
      const baselineResult = this.binnedResults[baselineIndex];
      const baselineRow = {
        scenarioName: baselineScenario.scenarioName,
        scenarioId: baselineScenario.scenarioId,
        histograms: baselineResult.map(histogramData => ({
          base: histogramData,
          change: null
        }))
      };
      // Then display each other scenario, after calculating the histogram diff
      const otherRows: HistogramRow[] = [];
      this.projections.forEach(({ scenarioName, scenarioId }, index) => {
        if (index !== baselineIndex) {
          const result = this.binnedResults[index];
          otherRows.push({
            scenarioName,
            scenarioId,
            histograms: compareHistograms(baselineResult, result)
          });
        }
      });
      return [baselineRow, ...otherRows];
    }
  },
  methods: {
    isHiddenTimeSlice(timeSliceIndex: number): boolean {
      return (
        this.isScenarioComparisonActive &&
        timeSliceIndex !== this.selectedTimeSliceIndex
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
    position: relative;

    .time-slice-arrow-button {
      position: absolute;
      right: calc(100% + 5ch);
      top: 0;

      &.right {
        right: auto;
        // The h3 element stretches to take up the hidden 3rd column, so we
        //  need to hardcode how far to the right to move the right arrow.
        left: 25ch;
      }
    }
  }
  margin-bottom: 20px;
}

.x-axis-label {
  margin-bottom: 0;

  // If scenario comparison is not active, add two extra columns to the right
  &.left-aligned::after {
    display: block;
    content: '';
    flex: 4;
    min-width: 0;
  }

  h4 {
    @include header-secondary;
  }
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
