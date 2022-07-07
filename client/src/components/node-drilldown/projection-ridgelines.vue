<template>
  <div class="projection-ridgelines-container">
    <div id="header-section" class="grid-row slice-labels x-axis-label">
      <h3>
        <span class="lighter">Change in</span>
        {{ nodeConceptName }}
        <span class="lighter">relative to</span>
        {{ comparisonBaselineName }}
      </h3>
    </div>
    <div class="grid-row slice-labels">
      <h3 v-for="(timeSliceLabel, index) in timeSliceLabels" :key="index">
        {{ timeSliceLabel }}
      </h3>
    </div>
    <div class="scrollable">
      <div
        v-for="row of rowsToDisplay"
        :key="row.scenarioId"
        class="scenario-row"
      >
        <div class="grid-row">
          <div class="first-column">
            <div class="scenario-name" @click="selectScenario(row.scenarioId)">
              <i
                v-if="selectedScenarioId === row.scenarioId"
                class="fa fa-circle"
              />
              <i v-else class="fa fa-circle-o" />
              <h3 style="margin-left: 5px">{{ row.scenarioName }}</h3>
            </div>
            <span class="scenario-desc" v-tooltip.top-start="row.scenarioDesc">
              {{ row.scenarioDesc }}
            </span>
            <div
              v-for="clamp in getScenarioClamps(row)"
              :key="clamp.concept"
              class="clamp-name"
            >
              <i class="fa fa-circle scenario-clamp-icon" />
              {{ ontologyFormatter(clamp.concept) }}
            </div>
            <!-- If there is more than one scenario and this is the comparison
              baseline, label it -->
            <h4
              v-if="
                rowsToDisplay.length > 1 &&
                row.scenarioId === comparisonBaselineId
              "
              class="comparison-baseline-control"
            >
              Comparison baseline
            </h4>
            <!-- Else if there is more than one scenario, show a button to make
              this the comparison baseline-->
            <button
              v-else-if="rowsToDisplay.length > 1"
              class="btn btn-sm  comparison-baseline-control"
              @click="$emit('set-comparison-baseline-id', row.scenarioId)"
            >
              Use as comparison baseline
            </button>
          </div>
          <div
            v-for="(ridgelineData, timeSliceIndex) of row.ridgelines"
            :key="timeSliceIndex"
            class="ridgeline-with-summary"
          >
            <ridgeline
              class="ridgeline"
              :ridgeline-data="ridgelineData"
              :comparison-baseline="
                row.comparisonBaseline
                  ? row.comparisonBaseline[timeSliceIndex]
                  : null
              "
              :min="indicatorMin"
              :max="indicatorMax"
              :historical-timeseries="historicalTimeseries"
              :context-range="row.contextRanges[timeSliceIndex]"
            />
            <div v-if="row.summaries.length > timeSliceIndex">
              {{ row.summaries[timeSliceIndex].before }}
              <strong>
                {{ row.summaries[timeSliceIndex].emphasized }}
              </strong>
              {{ row.summaries[timeSliceIndex].after }}
            </div>
          </div>
        </div>
        <div v-if="!row.is_valid" class="stale-scenario">
          <div class="transparent"></div>
          <!-- overlay on top of the projection ridgelines -->
          <div>
            <span>Pending changes</span>
          </div>
        </div>
      </div>
      <div
        v-if="requestAddingNewScenario"
        class="new-scenario-row"
        id="new-scenario-row"
      >
        <cag-scenario-form
          @save="saveScenario"
          @cancel="requestAddingNewScenario = false"
        />
      </div>
      <button
        v-else
        v-tooltip.top-center="'Add a new model scenario'"
        type="button"
        class="btn btn-call-to-action"
        style="align-self: flex-start"
        @click="addNewScenario"
      >
        <i class="fa fa-plus-circle" />
        Add new scenario
      </button>
      <button
        class="btn"
        style="align-self: flex-start; margin-top: 10px"
        @click="switchToHistoricalOnlyScenario"
      >
        Hide scenarios
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import {
  CAGModelSummary,
  ScenarioParameter,
  ScenarioProjection
} from '@/types/CAG';
import { defineComponent, nextTick, PropType } from 'vue';
import Ridgeline from '@/components/widgets/charts/ridgeline.vue';
import { getTimeScaleOption } from '@/utils/time-scale-util';
import useOntologyFormatter from '@/services/composables/useOntologyFormatter';
import { mapActions, mapGetters } from 'vuex';
import CagScenarioForm from '@/components/cag/cag-scenario-form.vue';
import {
  calculateTypicalChangeBracket,
  convertDistributionTimeseriesToRidgelines,
  RidgelineWithMetadata,
  summarizeRidgelineComparison
} from '@/utils/ridgeline-util';
import { scrollToElement, scrollToElementWithId } from '@/utils/dom-util';
import { TimeseriesPoint } from '@/types/Timeseries';

interface RidgelineRow {
  scenarioName: string;
  scenarioDesc: string;
  scenarioId: string;
  is_valid: boolean;
  parameter: ScenarioParameter;
  ridgelines: RidgelineWithMetadata[];
  comparisonBaseline: RidgelineWithMetadata[] | null;
  // TODO: extract type
  summaries: { before: string; emphasized: string; after: string; }[];
  contextRanges: ({ min: number; max: number } | null)[];
}

export default defineComponent({
  components: { Ridgeline, CagScenarioForm },
  name: 'ProjectionRidgelines',
  emits: ['new-scenario', 'set-comparison-baseline-id'],
  props: {
    modelSummary: {
      type: Object as PropType<CAGModelSummary>,
      required: true
    },
    nodeConceptName: {
      type: String,
      default: ''
    },
    comparisonBaselineId: {
      type: String,
      default: null
    },
    baselineScenarioId: {
      type: String,
      default: null
    },
    projections: {
      type: Array as PropType<ScenarioProjection[]>,
      default: []
    },
    indicatorMin: {
      type: Number,
      required: true
    },
    indicatorMax: {
      type: Number,
      required: true
    },
    historicalTimeseries: {
      type: Array as PropType<TimeseriesPoint[]>,
      default: []
    }
  },
  data: () => ({
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
    timeSliceLabels(): string[] {
      const timeScale = this.modelSummary.parameter.time_scale;
      const timeSlices = getTimeScaleOption(timeScale).timeSlices;
      return timeSlices.map(({ label }) => `In ${label}`);
    },
    // TODO: use this to render all ridgelines in the td-chart
    // allSelectedScenarioRidgelines(): RidgelineRow {
    //   // Not just at timeslices
    //   return {}; // TODO:
    // },
    ridgelinesAtTimeslices(): RidgelineRow[] {
      if (this.baselineScenarioId === null) return [];
      const baselineProjections = this.projections.find(
        projection => projection.scenarioId === this.baselineScenarioId
      );
      if (baselineProjections === undefined) {
        console.error(
          'Unable to find projection data for baseline scenario ' +
            this.baselineScenarioId
        );
        return [];
      }
      const rows: RidgelineRow[] = this.projections.map(scenarioProjection => {
        const {
          scenarioId,
          scenarioName,
          scenarioDesc,
          values,
          is_valid,
          parameter
        } = scenarioProjection;
        // If scenario has no projections, use the projections from the
        //  baseline scenario, because
        //  - they are guaranteed to exist
        //  - they will be the correct projections until clamps are added
        const projectionValues =
          values.length > 0 ? values : baselineProjections.values;

        // Convert the distributions at each timeslice to ridgelines with
        //  metadata for each slice
        const contextRanges: ({ min: number; max: number } | null)[] = [];
        const ridgelines = convertDistributionTimeseriesToRidgelines(
          projectionValues,
          this.modelSummary.parameter.time_scale,
          this.indicatorMin,
          this.indicatorMax
        );
        ridgelines.forEach(ridgelinesWithMetadata => {
          // Calculate context range
          const contextRange = calculateTypicalChangeBracket(
            this.historicalTimeseries,
            ridgelinesWithMetadata.monthsAfterNow,
            this.modelSummary.parameter.projection_start
          );
          contextRanges.push(contextRange);
        });
        return {
          scenarioId,
          scenarioName,
          scenarioDesc,
          is_valid,
          parameter,
          ridgelines,
          // Comparison baseline will be injected in `rowsToDisplay` after all
          //  projections have been converted to ridgelines
          comparisonBaseline: null,
          // Summaries will also be injected once comparisonBaseline is.
          summaries: [],
          contextRanges
        };
      });
      return rows;
    },
    rowsToDisplay(): RidgelineRow[] {
      // Move selected scenario to othe top
      const rows = this.moveRidgelineRowToTop(
        this.selectedScenarioId,
        this.ridgelinesAtTimeslices
      );
      // Inject comparison baseline into each other row for rendering within
      //  `ridgeline.vue`
      // Note that the "comparison baseline scenario" may not be the scenario
      //  without clamps (also referred to as the "baseline scenario")
      const baselineId = this.comparisonBaselineId;
      const comparisonBaselineRidgelines =
        rows.find(row => row.scenarioId === baselineId)?.ridgelines ?? null;
      rows.forEach(row => {
        row.comparisonBaseline =
          row.scenarioId === baselineId ? null : comparisonBaselineRidgelines;
      });
      // Calculate and store the summary for each ridgeline
      rows.forEach(row => {
        // New row objects are only created when the projections or
        //  parameterization changes, so reset the `summaries` property.
        row.summaries = [];
        if (row.comparisonBaseline === null) {
          return;
        }
        row.ridgelines.forEach((ridgeline, index) => {
          // Assert that row.comparisonBaseline is not null because of the check
          //  above.
          const sourceRidgelines =
            row.comparisonBaseline as RidgelineWithMetadata[];
          const sourceRidgeline = sourceRidgelines[index];
          const summary = summarizeRidgelineComparison(
            ridgeline,
            sourceRidgeline,
            this.indicatorMin,
            this.indicatorMax
          );
          row.summaries.push(summary);
        });
      });
      return rows;
    },
    comparisonBaselineName() {
      return this.ridgelinesAtTimeslices.find(
        row => row.scenarioId === this.comparisonBaselineId
      )?.scenarioName ?? '';
    }
  },
  methods: {
    ...mapActions({
      setSelectedScenarioId: 'model/setSelectedScenarioId'
    }),
    getScenarioClamps(row: RidgelineRow) {
      return row.parameter.constraints;
    },
    selectScenario(scenarioId: string | null) {
      if (this.selectedScenarioId === scenarioId) {
        return;
      }
      this.scrollToTop();
      this.setSelectedScenarioId(scenarioId);
    },
    addNewScenario() {
      this.requestAddingNewScenario = true;
      nextTick(() => {
        scrollToElementWithId('new-scenario-row');
      });
    },
    saveScenario(info: { name: string; description: string }) {
      this.$emit('new-scenario', {
        name: info.name,
        description: info.description
      });
      this.requestAddingNewScenario = false;
      this.scrollToTop();
    },
    scrollToTop() {
      const scrollables = document.getElementsByClassName('scrollable');
      if (scrollables.length !== 1) return;
      const rows = scrollables[0].children;
      if (rows.length === 0) return;
      scrollToElement(rows[0]);
    },
    switchToHistoricalOnlyScenario() {
      this.setSelectedScenarioId(null);
    },
    moveRidgelineRowToTop(scenarioId: string, rows: RidgelineRow[]) {
      const row = rows.find(
        ridgelineRow => ridgelineRow.scenarioId === scenarioId
      );
      if (row === undefined) {
        console.error(
          'Unable to find ridgelines for a scenario with ID',
          scenarioId
        );
        return rows;
      }
      return [
        row,
        ...rows.filter(ridgelineRow => ridgelineRow.scenarioId !== scenarioId)
      ];
    }
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.projection-ridgelines-container {
  display: flex;
  flex-direction: column;
}

.scrollable {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

h3,
h4 {
  margin: 0;
}

h3 {
  font-size: $font-size-extra-large;
  font-weight: normal;
}

$grid-row-gap-size: 5px;
.grid-row {
  display: flex;
  gap: $grid-row-gap-size;
  & > * {
    flex: 1;
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
    background-color: rgba(255, 255, 255, 0.7);
    flex: 4;
    z-index: 1;
    align-items: flex-end;
    justify-content: end;
    position: relative;
    span {
      background: grey;
      padding: 2px 10px;
      border-radius: 50px;
      color: white;
      font-size: $font-size-large;
      position: absolute;
      bottom: 10px;
      right: 10px;
    }
  }
}

.slice-labels {
  // Add empty column at the left to align first label with first ridgeline.
  &::before {
    display: block;
    content: '';
    flex: 1;
    min-width: 0;
  }
  h3 {
    color: $label-color;
    position: relative;
    font-size: $font-size-large;
  }
  margin-bottom: 20px;
}

.x-axis-label {
  margin-bottom: 0;
  // Since this row only has two cells, we need to divide the gap size by 4 to
  //  align the second cell of this row with the second cell of the other rows.
  gap: $grid-row-gap-size / 4;

  h3 {
    flex: 4;
  }
}

.lighter {
  color: $text-color-light;
}

.scenario-row {
  position: relative;
  padding-bottom: 10px;
  margin-bottom: 30px;
  &:not(:last-child) {
    border-bottom: 1px solid lightgray;
  }
}

.first-column {
  z-index: 1; // allow clicking through the overlay for scenario selection
  $circle-width: 1rem;
  $gap-size: 5px;
  .scenario-name {
    display: flex;
    align-items: baseline;
    cursor: pointer;
    user-select: none;
    &:hover {
      color: rgb(92, 92, 92);
    }

    i {
      font-size: $circle-width;
    }

    h3 {
      font-size: $font-size-large;
    }
  }
  .scenario-desc {
    margin-left: calc(#{$circle-width} + #{$gap-size});
    color: $label-color;
    cursor: pointer;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;

    @supports (-webkit-line-clamp: 2) {
      white-space: initial;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }
  .clamp-name {
    padding-left: calc(#{$circle-width} + #{$gap-size});
    color: gray;
    font-size: small;
    user-select: none;
    .scenario-clamp-icon {
      user-select: none;
      color: $selected;
      font-size: 0.75 * $circle-width;
    }
  }
}

.comparison-baseline-control {
  margin-top: 5px;
}


h4 {
  @include header-secondary;
}

h4.comparison-baseline-control {
  font-size: $font-size-small;
}

.new-scenario-row {
  display: flex;
  flex-direction: column;
  width: max-content;
  margin-bottom: 1rem;
  margin-left: 2rem;
}

.ridgeline-with-summary {
  display: flex;
  flex-direction: column;
}

.ridgeline {
  height: 100px;
  position: relative;
}
</style>
