<template>
  <div class="projection-histograms-container">
    <div
      id='header-section'
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
      class="scenario-row"
    >
      <div class="scenario-desc"><span v-tooltip="row.scenarioDesc">{{ row.scenarioDesc }}</span></div>
      <div class="grid-row">
        <div class="scenario-and-clamps">
          <div class="scenario-name" @click="selectScenario(row.scenarioId)">
            <i v-if="selectedScenarioId === row.scenarioId" class="fa fa-circle" />
            <i v-else class="fa fa-circle-o" />
            <h3 style="margin-left: 4px" :class="{ 'scenario-title-stale': !row.is_valid }">{{ row.is_valid ? row.scenarioName : (row.scenarioName + ' (Stale)') }}</h3>
          </div>
          <div
            v-for="clamp in getScenarioClamps(row)"
            :key="clamp.concept"
            class="clamp-name">
              <i class="fa fa-circle scenario-clamp-icon" />
              {{ ontologyFormatter(clamp.concept) }}
          </div>
        </div>
        <histogram
          v-for="(histogramData, timeSliceIndex) of row.histograms"
          class="histogram"
          :class="{ hidden: isHiddenTimeSlice(timeSliceIndex) }"
          :key="timeSliceIndex"
          :histogram-data="histogramData"
          :constraint-summary="
            constraintSummaries[row.scenarioId][timeSliceIndex]
          "
        />
      </div>
      <div v-if="!row.is_valid" class="stale-scenario">
        <div class="transparent"></div>
        <!-- overlay on top of the projection histograms -->
        <div>
          <span>Pending Changes</span>
        </div>
      </div>
    </div>
    <div
      v-if="requestAddingNewScenario"
      class="new-scenario-row"
      id='new-scenario-row'>
      <cag-scenario-form
        @save="saveScenario"
        @cancel="requestAddingNewScenario = false"
      />
    </div>
    <button
      v-else
      v-tooltip.top-center="'Add a new model scenario'"
      type="button"
      class="btn btn-primary btn-call-for-action"
      style="width: max-content; margin-left: 2rem"
      @click="addNewScenario">
        <i class="fa fa-plus-circle" />
        Add new scenario
    </button>
  </div>
</template>

<script lang="ts">
import { CAGModelSummary, ScenarioParameter, ScenarioProjection } from '@/types/CAG';
import { TimeseriesPoint } from '@/types/Timeseries';
import { defineComponent, nextTick, PropType } from 'vue';
import Histogram from '@/components/widgets/charts/histogram.vue';
import {
  BinBoundaries,
  BinCounts,
  convertTimeseriesDistributionToHistograms,
  HistogramData,
  ProjectionHistograms,
  summarizeConstraints
} from '@/utils/histogram-util';
import { TIME_SCALE_OPTIONS_MAP } from '@/utils/time-scale-util';
import SmallIconButton from '@/components/widgets/small-icon-button.vue';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { mapActions, mapGetters } from 'vuex';
import CagScenarioForm from '@/components/cag/cag-scenario-form.vue';

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
  base: BinCounts;
  change: BinCounts | null;
  binBoundaries: BinBoundaries;
}

interface HistogramRow {
  scenarioName: string;
  scenarioDesc: string;
  scenarioId: string;
  is_valid: boolean;
  parameter: ScenarioParameter;
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
    histogramData.binCounts.forEach((barValue, barIndex) => {
      // Calculate the difference from the baseline value to the result value
      const baselineValue = baseline[timeSliceIndex].binCounts[barIndex];
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
    return {
      base: base as BinCounts,
      change: change as BinCounts,
      binBoundaries: histogramData.binBoundaries
    };
  });
}

export default defineComponent({
  components: { Histogram, SmallIconButton, CagScenarioForm },
  name: 'ProjectionHistograms',
  emits: ['new-scenario'],
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
    selectedTimeSliceIndex: 1,
    requestAddingNewScenario: false
  }),
  setup() {
    return {
      ontologyFormatter: useOntologyFormatter()
    };
  },
  computed: {
    ...mapGetters({
      selectedScenarioId: 'model/selectedScenarioId'
    }),
    isScenarioComparisonActive(): boolean {
      return this.comparisonBaselineId !== null;
    },
    timeSliceLabels(): string[] {
      const timeScale = this.modelSummary.parameter.time_scale;
      const timeSlices = TIME_SCALE_OPTIONS_MAP.get(timeScale)?.timeSlices;
      return timeSlices?.map(({ label }) => `In ${label}`) ?? ['', '', ''];
    },
    binnedResults(): (ProjectionHistograms | null)[] {
      // Convert projection results into histograms, or `null` if the scenario
      //  hasn't been run yet

      // Ensure we pass an empty array of historical data if no indicator is
      //  being used to ground this node, since we currently (Nov 2021)
      //  artificially add 3 points with a value of 0.5 to abstract nodes
      const isAbstractNode = this.indicatorId === null;
      return this.projections.map(projection => {
        if (projection.values.length === 0) {
          return null;
        }
        return convertTimeseriesDistributionToHistograms(
          this.modelSummary.parameter.time_scale,
          isAbstractNode ? [] : this.historicalTimeseries,
          projection.values
        );
      });
    },
    constraintSummaries() {
      const summaries: { [scenarioId: string]: ProjectionHistograms } = {};
      const isAbstractNode = this.indicatorId === null;
      const projectionStartTimestamp = this.modelSummary.parameter
        .projection_start;
      this.projections.forEach(projection => {
        summaries[projection.scenarioId] = summarizeConstraints(
          this.modelSummary.parameter.time_scale,
          isAbstractNode ? [] : this.historicalTimeseries,
          projectionStartTimestamp,
          projection.constraints ?? []
        );
      });
      return summaries;
    },
    rowsToDisplay(): HistogramRow[] {
      if (!this.isScenarioComparisonActive) {
        const histogramRows: HistogramRow[] = this.projections.map((projection, index) => {
          const results = this.binnedResults[index];
          // If a scenario has been created but not yet run, map it to an empty
          //  array instead of histograms
          let histograms: ComparisonHistogramData[] = [];
          if (results !== null) {
            histograms = results.map(({ binCounts, binBoundaries }) => ({
              base: binCounts,
              change: null,
              binBoundaries
            }));
          }
          return {
            scenarioName: projection.scenarioName,
            scenarioDesc: projection.scenarioDesc,
            is_valid: projection.is_valid,
            scenarioId: projection.scenarioId,
            parameter: projection.parameter,
            histograms
          };
        });
        return histogramRows;
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
      if (baselineResult === null) {
        console.error(
          'Unable to compare to scenario "' +
            baselineScenario.scenarioName +
            '", since it doesn\'t have projection results."'
        );
        return [];
      }
      const baselineRow = {
        scenarioName: baselineScenario.scenarioName,
        scenarioDesc: baselineScenario.scenarioDesc,
        scenarioId: baselineScenario.scenarioId,
        is_valid: baselineScenario.is_valid,
        parameter: baselineScenario.parameter,
        histograms: baselineResult.map(({ binCounts, binBoundaries }) => ({
          base: binCounts,
          change: null,
          binBoundaries
        }))
      };
      // Then display each other scenario, after calculating the histogram diff
      const otherRows: HistogramRow[] = [];
      this.projections.forEach(({ scenarioName, scenarioDesc, scenarioId, is_valid, parameter }, index) => {
        if (index !== baselineIndex) {
          const result = this.binnedResults[index];
          // If this scenario has no projection results yet, don't display any
          //  histograms
          const histograms =
            result === null ? [] : compareHistograms(baselineResult, result);
          otherRows.push({
            scenarioName,
            scenarioDesc,
            scenarioId,
            is_valid,
            parameter,
            histograms
          });
        }
      });
      return [baselineRow, ...otherRows];
    }
  },
  methods: {
    ...mapActions({
      setSelectedScenarioId: 'model/setSelectedScenarioId'
    }),
    isHiddenTimeSlice(timeSliceIndex: number): boolean {
      return (
        this.isScenarioComparisonActive &&
        timeSliceIndex !== this.selectedTimeSliceIndex
      );
    },
    getConstraintSummary(
      scenarioId: string,
      timeSliceIndex: number
    ): HistogramData {
      return this.constraintSummaries[scenarioId][timeSliceIndex];
    },
    getScenarioClamps(row: HistogramRow) {
      return row.parameter.constraints;
    },
    selectScenario(scenarioId: string | null) {
      if (this.selectedScenarioId === scenarioId) {
        return;
      }
      this.scrollToSection('header-section');
      this.setSelectedScenarioId(scenarioId);
    },
    scrollToSection(sectionName: string) {
      const elm = document.getElementById(sectionName) as HTMLElement;
      const scrollViewOptions: ScrollIntoViewOptions = {
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      };
      elm.scrollIntoView(scrollViewOptions);
    },
    addNewScenario() {
      this.requestAddingNewScenario = true;
      nextTick(() => {
        this.scrollToSection('new-scenario-row');
      });
    },
    saveScenario(info: {name: string; description: string}) {
      this.$emit('new-scenario', {
        name: info.name,
        description: info.description
      });
      this.requestAddingNewScenario = false;
      this.scrollToSection('header-section');
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
  & > * {
    flex: 2;
    min-width: 0;
  }
}

.stale-scenario {
  width: 100%;
  height: 100%;
  display: flex;
  position: absolute;
  top: 0;
  padding-bottom: 10px;
  margin-bottom: 30px;
  .transparent {
    flex: 1;
  }
  div:not(:first-child) {
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, .1);
    flex: 6;
    z-index: 1;
    align-items: flex-end;
    justify-content: end;
    position: relative;
    span {
      color: orange;
      background-color: white;
      font-size: large;
      margin-right: 1rem;
      margin-bottom: 1rem;
      cursor: default;
      position: absolute;
      bottom: 0;
      right: 0;
    }
  }
}

.scenario-desc {
  display: flex;
  margin-bottom: 0;
  span {
    color: $label-color;
    flex: 4;
    min-width: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow-x: hidden;
    cursor: pointer;
  }
  // Add empty column at the left to align first label with first histogram.
  &::before {
    display: block;
    content: '';
    flex: 1;
    min-width: 0;
  }
  // If scenario comparison is not active, add two extra columns to the right
  &::after {
    display: block;
    content: '';
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

.scenario-title-stale {
  color: gray;
}

.scenario-row {
  position: relative;
  padding-bottom: 10px;
  margin-bottom: 30px;
  &:not(:last-child) {
    border-bottom: 1px solid lightgray;
  }
}

.scenario-and-clamps {
  // Give this column half of the space
  flex: 1;
  z-index: 1; // allow clicking through the overlay for scenario selection
  .scenario-name {
    display: flex;
    align-items: baseline;
    cursor: pointer;
    user-select: none;
    &:hover {
      color: rgb(92, 92, 92);
    }
  }
  .clamp-name {
    padding-left: 2rem;
    color: gray;
    font-size: small;
    user-select: none;
    .scenario-clamp-icon {
      user-select: none;
      color: $selected;
      font-size: $font-size-small;
    }
  }
}

.new-scenario-row {
  display: flex;
  flex-direction: column;
  width: max-content;
  margin-bottom: 1rem;
  margin-left: 2rem;
}

</style>
