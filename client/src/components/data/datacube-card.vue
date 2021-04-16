<template>
  <div class="datacube-card-container">
    <header>
      <div class="datacube-header" v-if="isExpanded">
        <h5>Production - DSSAT</h5>
        <disclaimer
          v-if="scenarioCount > 0"
          :message="
            scenarioCount +
              ' scenarios. Click a vertical line to select or deselect it.'
          "
        />
      </div>
      <datacube-scenario-header
        class="scenario-header"
        :outputVariable="'Crop production'"
        :outputVariableUnits="'tonnes'"
        :selectedScenarios="selectedScenarios"
        v-else
      />
      <button v-tooltip="'Collapse datacube'" class="btn btn-default">
        <!-- @click="TODO" -->
        <i class="fa fa-fw fa-compress" />
      </button>
    </header>
    <div class="flex-row">
      <!-- if has multiple scenarios -->
      <div class="scenario-selector">
        <div style="padding-left: 1rem">
          <div class="baseline-checkbox">
            <label @click="toggleBaselineDefaultsVisibility()">
              <i
                class="fa fa-lg fa-fw"
                :class="{ 'fa-check-square-o': showBaselineDefaults, 'fa-square-o': !showBaselineDefaults }"
              />
              Baseline Defaults
            </label>
          </div>
        </div>
        <parallel-coordinates-chart
          v-if="dimensionsData"
          :dimensions-data="dimensionsData"
          :selected-dimensions="selectedDimensions"
          :ordinal-dimensions="ordinalDimensions"
          :initial-data-selection="initialScenarioSelection"
          :show-baseline-defaults="showBaselineDefaults"
          @select-scenario="updateScenarioSelection"
        />
      </div>
      <div class="column">
        <!-- TODO: extract button-group to its own component -->
        <div class="button-group">
          <button class="btn btn-default" disabled>
            <!-- @click="TODO" -->
            Data</button
          ><button class="btn btn-default">
            <!-- @click="TODO" -->
            Descriptions
          </button>
        </div>
        <header v-if="isExpanded">
          <datacube-scenario-header
            class="scenario-header"
            :outputVariable="'Crop production'"
            :outputVariableUnits="'tonnes'"
            :selectedScenarios="selectedScenarios"
          />
          <!-- button group (add 'crop production' node to CAG, quantify 'crop production', etc.) -->
        </header>
        <timeseries-chart
          class="timeseries-chart"
          :timeseries-data="timeseriesData"
        />
        <div class="map placeholder">TODO: Map visualization</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue';

import DatacubeScenarioHeader from '@/components/data/datacube-scenario-header.vue';
import timeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import ParallelCoordinatesChart from '@/components/widgets/charts/parallel-coordinates.vue';
import { ScenarioDef } from '@/types/Datacubes';

import { SCENARIOS_LIST, TIMESERIES_DATA, DIMENSIONS_LIST } from '@/assets/scenario-data';

const COLORS = [
  '#44f',
  '#4b6',
  '#d4d'
  // TODO: choose better colours and add more of them
];

export default defineComponent({
  name: 'DatacubeCard',
  props: {
    isExpanded: {
      type: Boolean,
      default: true
    }
    // TODO: probably we'll want this component to receive either a full datacube object
    //  or a datacube ID to fetch the full datacube object itself.
  },
  components: { timeseriesChart, DatacubeScenarioHeader, Disclaimer, ParallelCoordinatesChart },
  setup() {
    const selectedScenarios = ref<{ [key: string]: number | string }[]>([]);
    // TODO: for now, assume all scenarios are selected
    // Assign each selected scenario a colour
    selectedScenarios.value = SCENARIOS_LIST.map((scenario, index) => {
      return { ...scenario, _SCENARIO_COLOR: COLORS[index % COLORS.length] };
    });
    const scenarioCount = computed(() => SCENARIOS_LIST.length);
    const timeseriesData = computed(() =>
      TIMESERIES_DATA.map(timeseries => {
        // Get the color of the selected scenario with a matching _SCENARIO_ID
        //  or default to black if no matching scenario is found.
        const color =
          selectedScenarios.value.find(
            scenario => scenario.id === timeseries._SCENARIO_ID
          )?._SCENARIO_COLOR ?? '#000';
        return {
          ...timeseries,
          color
        };
      })
    );

    const dimensionsData = SCENARIOS_LIST;
    const selectedDimensions = DIMENSIONS_LIST;
    const ordinalDimensions = undefined;
    const initialScenarioSelection: Array<string> = [];
    const updateScenarioSelection = (e: { scenarios: Array<ScenarioDef> }) => {
      if (e.scenarios.length === 0 ||
         (e.scenarios.length === 1 && e.scenarios[0] === undefined)) {
        console.log('no line is selected');
      } else {
        console.log('user selected: ' + e.scenarios.length);
      }
    };
    return {
      selectedScenarios,
      timeseriesData,
      scenarioCount,
      dimensionsData,
      selectedDimensions,
      ordinalDimensions,
      initialScenarioSelection,
      updateScenarioSelection
    };
  },
  data: () => ({
    showBaselineDefaults: false
  }),
  methods: {
    toggleBaselineDefaultsVisibility() {
      this.showBaselineDefaults = !this.showBaselineDefaults;

      const overrideCurrentScenarioSelection = false;
      if (overrideCurrentScenarioSelection) {
        this.initialScenarioSelection.length = 0;
        if (this.showBaselineDefaults) {
          // find any baseline scenarios and select by default
          this.dimensionsData.forEach(scenario => {
            if (scenario.baseline as string === 'true') {
              this.initialScenarioSelection.push(scenario.id as string);
            }
          });
        }
      }
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';
.datacube-card-container {
  background: $background-light-1;
  box-shadow: $shadow-level-1;
  padding: 10px;
  border-radius: 3px;
  display: flex;
  flex-direction: column;
}

.flex-row {
  display: flex;
  flex: 1;
}

header {
  display: flex;
  align-items: center;

  h5 {
    display: inline-block;
    font-size: $font-size-large;
    margin: 0;
    font-weight: normal;
  }
}

.datacube-header {
  flex: 1;
}

.scenario-header {
  flex: 1;
}

.column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.scenario-selector {
  width: 25%;
  margin-right: 10px;
  height: 500px;
}

.baseline-checkbox {
  display: inline-block;
  label {
    font-weight: normal;
    cursor: pointer;
    margin: 0;
  }
}

.timeseries-chart {
  flex: 1;
}

.map {
  flex: 3;
}

// TODO: remove
.placeholder {
  background: #eee;
  text-align: center;
  padding: 10px;
  color: #bbb;
}
</style>
