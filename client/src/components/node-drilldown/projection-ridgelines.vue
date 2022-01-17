<template>
  <div class="projection-ridgelines-container">
    <div id="header-section" class="grid-row slice-labels x-axis-label">
      <h4>Change in value</h4>
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
        <div class="scenario-desc">
          <span v-tooltip.top-start="row.scenarioDesc">{{
            row.scenarioDesc
          }}</span>
        </div>
        <div class="grid-row">
          <div class="scenario-and-clamps">
            <div class="scenario-name" @click="selectScenario(row.scenarioId)">
              <i
                v-if="selectedScenarioId === row.scenarioId"
                class="fa fa-circle"
              />
              <i v-else class="fa fa-circle-o" />
              <h3 style="margin-left: 5px">{{ row.scenarioName }}</h3>
            </div>
            <div
              v-for="clamp in getScenarioClamps(row)"
              :key="clamp.concept"
              class="clamp-name"
            >
              <i class="fa fa-circle scenario-clamp-icon" />
              {{ ontologyFormatter(clamp.concept) }}
            </div>
          </div>
          <div
            class="ridgeline-wrapper"
            v-for="(ridgelineData, timeSliceIndex) of row.ridgelines"
            :key="timeSliceIndex"
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
            />
          </div>
        </div>
        <div v-if="!row.is_valid" class="stale-scenario">
          <div class="transparent"></div>
          <!-- overlay on top of the projection histograms -->
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
        class="btn btn-primary btn-call-for-action"
        style="align-self: flex-start"
        @click="addNewScenario"
      >
        <i class="fa fa-plus-circle" />
        Add new scenario
      </button>
      <button
        class="btn btn-default"
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
  convertDistributionTimeseriesToRidgelines,
  RidgelinePoint
} from '@/utils/ridgeline-util';
import { scrollToElementWithId } from '@/utils/dom-util';

interface RidgelineRow {
  scenarioName: string;
  scenarioDesc: string;
  scenarioId: string;
  is_valid: boolean;
  parameter: ScenarioParameter;
  ridgelines: RidgelinePoint[][];
  comparisonBaseline: RidgelinePoint[][] | null;
}

export default defineComponent({
  components: { Ridgeline, CagScenarioForm },
  name: 'ProjectionRidgelines',
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
        //  metadata for each slice, then map to remove the metadata
        const ridgelines = convertDistributionTimeseriesToRidgelines(
          projectionValues,
          this.modelSummary.parameter.time_scale,
          this.indicatorMin,
          this.indicatorMax
        ).map(ridgelinesWithMetadata => ridgelinesWithMetadata.ridgeline);
        return {
          scenarioId,
          scenarioName,
          scenarioDesc,
          is_valid,
          parameter,
          ridgelines,
          // Comparison baseline will be injected in `rowsToDisplay` after all
          //  projections have been converted to ridgelines
          comparisonBaseline: null
        };
      });
      return rows;
    },
    rowsToDisplay(): RidgelineRow[] {
      // Move comparison baseline to the top first
      // Note that the "comparison baseline scenario" may not be the scenario
      //  without clamps (also referred to as the "baseline scenario")
      let rows = this.moveRidgelineRowToTop(
        this.comparisonBaselineId,
        this.ridgelinesAtTimeslices
      );
      // Then move selected scenario above that
      rows = this.moveRidgelineRowToTop(this.selectedScenarioId, rows);
      // Inject comparison baseline to each other row for rendering within
      //  `ridgeline.vue`
      const comparisonBaselineRidgelines =
        rows.find(row => row.scenarioId === this.comparisonBaselineId)
          ?.ridgelines ?? null;
      rows
        .filter(row => row.scenarioId !== this.comparisonBaselineId)
        .forEach(
          row => (row.comparisonBaseline = comparisonBaselineRidgelines)
        );
      return rows;
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
      scrollToElementWithId('header-section');
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
      scrollToElementWithId('header-section');
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
    background-color: rgba(255, 255, 255, 0.7);
    flex: 8;
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

.scenario-desc {
  display: flex;
  margin-bottom: 0;
  span {
    color: $label-color;
    flex: 8;
    min-width: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow-x: hidden;
    cursor: pointer;
  }
  // Add empty column at the left to align description with first time slice.
  &::before {
    display: block;
    content: '';
    flex: 1;
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

  // Add three extra columns to the right
  &::after {
    display: block;
    content: '';
    flex: 6;
    min-width: 0;
  }

  h4 {
    @include header-secondary;
  }
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

.ridgeline-wrapper {
  height: 100px;
  position: relative;
}

// Ridgeline plot looks too stretched out if it takes the full width
.ridgeline {
  height: 100%;
  width: 50%;
}
</style>
