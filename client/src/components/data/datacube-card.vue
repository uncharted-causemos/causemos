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
        :selected-model-id="selectedModelId"
        :selected-scenario-ids="selectedScenarioIds"
        :color-from-index="colorFromIndex"
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
        <div>
          <div class="checkbox">
            <label @click="toggleBaselineDefaultsVisibility()">
              <i
                class="fa fa-lg fa-fw"
                :class="{ 'fa-check-square-o': showBaselineDefaults, 'fa-square-o': !showBaselineDefaults }"
              />
              Baseline Defaults
            </label>
          </div>
          <div class="checkbox">
            <label @click="toggleNewRunsMode()">
              <i
                class="fa fa-lg fa-fw"
                :class="{ 'fa-toggle-on': showNewRunsMode, 'fa-toggle-off': !showNewRunsMode }"
              />
              New Runs Mode
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
          :new-runs-mode="showNewRunsMode"
          @select-scenario="updateScenarioSelection"
          @generated-scenarios="updateGeneratedScenarios"
        />
        <div v-if="showNewRunsMode">
          <disclaimer
            :message="
              potentialScenarioCount +
                ' scenario(s) can be generated'
            "
          />
          <button
            class="search-button btn btn-primary btn-call-for-action"
            :class="{ 'disabled': potentialScenarioCount === 0}"
            @click="requestNewModelRuns()"
          >
            Request
          </button>
        </div>
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
            :selected-model-id="selectedModelId"
            :selected-scenario-ids="selectedScenarioIds"
            :color-from-index="colorFromIndex"
          />
          <!-- button group (add 'crop production' node to CAG, quantify 'crop production', etc.) -->
        </header>
        <timeseries-chart
          class="timeseries-chart"
          :timeseries-data="selectedTimeseriesData"
          :selected-timestamp="selectedTimestamp"
          @select-timestamp="emitTimestampSelection"
        />
        <!-- <div class="map placeholder">TODO: Map visualization</div> -->

        <!-- TODO: the map should accept a model ID and selectedScenarioID
        and fetch its own data -->
        <data-analysis-map
          class="card-map full-width"
          :selection="selection"
          :show-tooltip="false"
          :selected-admin-level="selectedAdminLevel"
          @on-map-load="onMapLoad"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, PropType, watch } from 'vue';

import DatacubeScenarioHeader from '@/components/data/datacube-scenario-header.vue';
import timeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import ParallelCoordinatesChart from '@/components/widgets/charts/parallel-coordinates.vue';
import { DimensionData, ScenarioData, ScenarioDef } from '@/types/Datacubes';
import DataAnalysisMap from '@/components/data/analysis-map.vue';
import ADMIN_LEVEL_DATA from '@/assets/admin-stats.js';
import { SCENARIOS_LIST } from '@/assets/scenario-data';
import API from '@/api/api';
import { Timeseries } from '@/types/Timeseries';

const COLORS = [
  '#44f',
  '#4b6',
  '#d4d'
  // TODO: choose better colours and add more of them
];

function colorFromIndex(index: number) {
  return COLORS[index % COLORS.length];
}

export default defineComponent({
  name: 'DatacubeCard',
  emits: ['on-map-load', 'set-selected-scenario-ids', 'select-timestamp'],
  props: {
    isExpanded: {
      type: Boolean,
      default: true
    },
    selectedAdminLevel: {
      type: Number,
      default: 0
    },
    selectedModelId: {
      type: String,
      default: null
    },
    allScenarioIds: {
      type: Array as PropType<string[]>,
      default: []
    },
    selectedScenarioIds: {
      type: Array as PropType<string[]>,
      default: []
    },
    selectedTimestamp: {
      type: Number,
      default: 0
    }
  },
  components: {
    timeseriesChart,
    DatacubeScenarioHeader,
    Disclaimer,
    ParallelCoordinatesChart,
    DataAnalysisMap
  },
  setup(props, { emit }) {
    const scenarioCount = computed(() => props.allScenarioIds.length);

    // Fetch timeseries data for each selected run, create a data
    //  structure that contains the colour for each run, and pass that to
    // timeseries chart
    // FIXME: this code contains a race condition if the selected model or
    //  scenario IDs were to change quickly and the promise sets completed
    //  out of order.
    const selectedTimeseriesData = ref<Timeseries[]>([]);
    async function fetchTimeseriesData() {
      selectedTimeseriesData.value = [];
      if (
        props.selectedModelId === null ||
        props.selectedScenarioIds.length === 0
      ) {
        return;
      }
      const promises = props.selectedScenarioIds.map(scenarioId =>
        API.get('fetch-demo-data', {
          params: {
            modelId: props.selectedModelId,
            runId: scenarioId,
            type: 'timeseries'
          }
        })
      );
      const allTimeseriesData = (await Promise.all(promises)).map(response =>
        JSON.parse(response.data)
      );
      selectedTimeseriesData.value = props.selectedScenarioIds.map((scenarioId, index) => {
        const color = colorFromIndex(index);
        return { color, points: allTimeseriesData[index] };
      });
    }

    // TODO: fetch model metadata to use in parallel coordinates

    // Fetch scenario metadata for each selected scenario
    // TODO: add scenario metadata schema/interface
    //  and replace `any` on the next line
    const selectedScenarioMetadata = ref<any>([]);
    async function fetchScenarioMetadata() {
      if (
        props.selectedModelId === null ||
        props.selectedScenarioIds.length === 0
      ) {
        return [];
      }
      const promises = props.selectedScenarioIds.map(scenarioId =>
        API.get('fetch-demo-data', {
          params: {
            modelId: props.selectedModelId,
            runId: scenarioId,
            type: 'metadata'
          }
        })
      );
      const allMetadata = (await Promise.all(promises)).map(metadata =>
        JSON.parse(metadata.data)
      );
      selectedScenarioMetadata.value = allMetadata;
      console.log('Fetched metadata for selected scenarios', allMetadata);
    }

    watch(() => props.selectedScenarioIds, () => {
      fetchScenarioMetadata();
      fetchTimeseriesData();
    }, {
      immediate: true
    });

    function emitTimestampSelection(newTimestamp: number) {
      emit('select-timestamp', newTimestamp);
    }
    return {
      selectedScenarios: SCENARIOS_LIST,
      selectedTimeseriesData,
      scenarioCount,
      adminLevelData: ADMIN_LEVEL_DATA,
      colorFromIndex,
      emitTimestampSelection
    };
  },
  computed: {
    selection() {
      // TODO: FIXME: yeah fix it would you
      return {
        id: '8f7bb630-c1d0-45d4-b21d-bb99f56af650',
        modelId: '2fe40c11-8862-4ab4-b528-c85dacdc615e',
        outputVariable: 'production',
        runId: '965c0e8c-1e66-4c16-b4d1-64d0607d6f69',
        timestamp: 1430438400000
      };
    }
    // return { id, modelId, outputVariable, ...selection };
  },
  data: () => ({
    showBaselineDefaults: false,
    showNewRunsMode: false,
    dimensionsData: [] as Array<ScenarioData>,
    selectedDimensions: [] as Array<DimensionData>,
    initialScenarioSelection: [] as Array<string>,
    allScenariosData: [] as Array<any>, // FIXME: this should use proper interfaces
    modelParametersMap: {} as {[key: string]: DimensionData},
    modelMetaData: {} as any,
    ordinalDimensions: [] as Array<string>,
    potentialScenarioCount: 0
  }),
  async mounted() {
    await this.fetchAllScenarioMetadata();
    // each original run is processed to actually reference to its parameters array
    const allRunsParams = this.allScenariosData.map(run => run.parameters);

    const outputParam = this.modelMetaData.outputs[0];
    const outputAggregations: any = {
      '2d80c9f0-1e44-4a6c-91fe-2ebb26e39dea': 313639493,
      '2ff53645-d481-4ff7-a067-e13f392f30a4': 115408980,
      '25e0971b-c229-4c9a-a0f9-c121fce51309': 116547768,
      '057d28d5-a7ed-472b-ae37-ba16571944ea': 146281019,
      '967a0a69-552f-4861-ad7f-0c1bd8bab856': 204827768
    };
    const baselineRunID: string = this.allScenariosData.find(run => run.default_run).id;

    const allProcessedRunsParams: Array<any> = [];
    allRunsParams.forEach((runParams, runIndx) => {
      const runParamsMapped = runParams.map((runParam: any) => {
        const paramName = this.modelParametersMap[runParam.id].name;
        return {
          name: paramName,
          value: runParam.value
        };
      });
      const run = runParamsMapped.reduce(
        (obj: any, item: any) => Object.assign(obj, { [item.name]: item.value }), {}
      );

      // explicitly add run-id as a parameter
      run.run_id = this.allScenariosData[runIndx].id;

      // explicitly add output for each run
      run[outputParam.name] = outputAggregations[run.run_id];

      allProcessedRunsParams.push(run);
    });

    const selectedParameters = Object.values(this.modelParametersMap);
    // explicitly add output parameter
    selectedParameters.push({
      name: outputParam.name,
      display_name: outputParam.display_name,
      description: outputParam.description,
      is_output: true,
      type: '', // FIXME
      default: outputAggregations[baselineRunID] // since this is the baseline run
    });
    // initially select the baseline
    // this.initialScenarioSelection = [baselineRunID]; // REVIEW: uncomment to select baseline run by default
    this.selectedDimensions = selectedParameters;
    this.dimensionsData = allProcessedRunsParams;

    // force 'rainfall_multiplier' to be ordinal
    this.ordinalDimensions = ['rainfall_multiplier'];

    // TODO: use each axis min/max based on the metadata
    // TODO: add/refine interfaces to clean up the code
  },
  methods: {
    async fetchAllScenarioMetadata() {
      await this.fetchAndBuildModelParameterMap();
      const promises = this.allScenarioIds.map(scenarioId =>
        API.get('fetch-demo-data', {
          params: {
            modelId: this.selectedModelId,
            runId: scenarioId,
            type: 'metadata'
          }
        })
      );
      const allMetadata = (await Promise.all(promises)).map(metadata =>
        JSON.parse(metadata.data)
      );
      this.allScenariosData = allMetadata;
      console.log('Fetched metadata for all scenarios', allMetadata);
    },
    async fetchAndBuildModelParameterMap() {
      await API.get('fetch-demo-data', {
        params: {
          modelId: this.selectedModelId,
          type: 'metadata'
        }
      }).then(result => {
        this.modelMetaData = JSON.parse(result.data);
        const modelParametes = this.modelMetaData.parameters;
        modelParametes.forEach((p: any) => {
          this.modelParametersMap[p.id] = p;
        });
        console.log('Fetched model parameters metadata', this.modelParametersMap);
      });
    },
    onMapLoad() {
      this.$emit('on-map-load');
    },
    toggleBaselineDefaultsVisibility() {
      this.showBaselineDefaults = !this.showBaselineDefaults;
    },
    toggleNewRunsMode() {
      this.showNewRunsMode = !this.showNewRunsMode;
      this.potentialScenarioCount = 0;
      // always force baselinedefault to be visible when the new-runs-mode is active
      if (this.showNewRunsMode) {
        this.showBaselineDefaults = true;
      }
    },
    requestNewModelRuns() {
      // FIXME: cast to 'any' since typescript cannot see mixins yet!
      (this as any).toaster('New runs requested\nPlease check back later!');
    },
    updateScenarioSelection(e: { scenarios: Array<ScenarioDef> }) {
      // TODO: emit 'set-selected-scenario-ids' with an array of selected scenario IDs
      //  It's important we don't just emit the one scenario they just selected, since
      //  the handler will replace the whole array.
      if (
        e.scenarios.length === 0 ||
        (e.scenarios.length === 1 && e.scenarios[0] === undefined)
      ) {
        console.log('no line is selected');
        this.$emit('set-selected-scenario-ids', []);
      } else {
        console.log('user selected: ' + e.scenarios.length);
        this.$emit('set-selected-scenario-ids', e.scenarios.map(s => s.run_id));
      }
    },
    updateGeneratedScenarios(e: { scenarios: Array<ScenarioData> }) {
      this.potentialScenarioCount = e.scenarios.length;
    }
  }
});
</script>

<style lang="scss" scoped>
@import '~styles/variables';

$fullscreenTransition: all 0.5s ease-in-out;

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
  height: 400px;
}

.checkbox {
  user-select: none; /* Standard syntax */
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

.card-map {
  height: 100%;
  width: 70%;

  &.full-width {
    width: 100%;
  }
}

.data-analysis-card-container {
  background: white;
  padding: 5px 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 4px rgba(39, 40, 51, 0.12);

  .aggregation-message {
    padding-bottom: 5px;
    height: 0;
    opacity: 0;
    transition: $fullscreenTransition;

    &.isVisible {
      opacity: 1;
      // Hardcode height to enable animation
      height: 34px;
    }

    &:not(.isVisible) {
      padding: 0;
    }
  }
}
</style>
