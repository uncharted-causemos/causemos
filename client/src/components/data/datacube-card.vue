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
        <parallel-coordinates-chart
          v-if="dimensionsData"
          :dimensions-data="dimensionsData"
          :selected-dimensions="selectedDimensions"
          :ordinal-dimensions="ordinalDimensions"
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
import { SCENARIOS_LIST, TIMESERIES_DATA } from '@/assets/scenario-data';
import API from '@/api/api';

const COLORS = [
  '#44f',
  '#4b6',
  '#d4d'
  // TODO: choose better colours and add more of them
];

export default defineComponent({
  name: 'DatacubeCard',
  emits: ['on-map-load', 'set-selected-scenario-ids'],
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
    }
  },
  components: {
    timeseriesChart,
    DatacubeScenarioHeader,
    Disclaimer,
    ParallelCoordinatesChart,
    DataAnalysisMap
  },
  setup(props) {
    const selectedScenarios = ref<{ [key: string]: number | string }[]>([]);
    // TODO: for now, assume all scenarios are selected
    // Assign each selected scenario a colour
    selectedScenarios.value = SCENARIOS_LIST.map((scenario, index) => {
      return { ...scenario, _SCENARIO_COLOR: COLORS[index % COLORS.length] };
    });
    const scenarioCount = computed(() => props.allScenarioIds.length);

    // TODO: fetch timeseries data for each selected run, create a data
    //  structure that contains the colour for each run, and pass that to
    // timeseries chart
    const timeseriesData = computed(() =>
      TIMESERIES_DATA.map(timeseries => {
        // Get the color of the selected scenario with a matching _SCENARIO_ID
        //  or default to black if no matching scenario is found.
        const color =
          selectedScenarios.value.find(
            scenario => scenario._SCENARIO_ID === timeseries._SCENARIO_ID
          )?._SCENARIO_COLOR ?? '#000';
        return {
          ...timeseries,
          color
        };
      })
    );

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
    //
    // parallel coordinatres dummy data
    //
    const dimensionsData: Array<ScenarioData> = [
      { id: '0', input1: 40, input2: 40, output: 55 },
      { id: '1', input1: 0, input2: 15, output: 10 },
      { id: '2', input1: 20, input2: 44, output: 25 },
      { id: '3', input1: 30, input2: 8, output: 70 }
    ];
    const selectedDimensions: Array<DimensionData> = [
      {
        name: 'input1',
        type: 'input',
        default: '10',
        description: 'my first input var'
      },
      {
        name: 'input2',
        type: 'input',
        default: '33',
        description: 'my second input var'
      },
      {
        name: 'output',
        type: 'output',
        default: '10',
        description: 'my first output var'
      }
    ];
    const ordinalDimensions = undefined;
    const updateScenarioSelection = (e: { scenarios: Array<ScenarioDef> }) => {
      // TODO: emit 'set-selected-scenario-ids' with an array of selected scenario IDs
      //  It's important we don't just emit the one scenario they just selected, since
      //  the handler will replace the whole array.
      if (
        e.scenarios.length === 0 ||
        (e.scenarios.length === 1 && e.scenarios[0] === undefined)
      ) {
        console.log('no line is selected');
      } else {
        console.log('user selected: ' + e.scenarios.length);
      }
    };
    watch(props.selectedScenarioIds, fetchScenarioMetadata, {
      immediate: true
    });
    return {
      selectedScenarios,
      timeseriesData,
      scenarioCount,
      dimensionsData,
      selectedDimensions,
      ordinalDimensions,
      updateScenarioSelection,
      adminLevelData: ADMIN_LEVEL_DATA
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
      // return { id, modelId, outputVariable, ...selection };
    }
  },
  methods: {
    onMapLoad() {
      this.$emit('on-map-load');
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
  height: 500px;
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
