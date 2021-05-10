<template>
  <div class="datacube-card-container">
    <header>
      <slot name="datacube-scenario-header" />
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
          v-if="runParameterValues"
          :dimensions-data="runParameterValues"
          :selected-dimensions="dimensions"
          :ordinal-dimensions="ordinalDimensionNames"
          :initial-data-selection="isDescriptionView ? [] : initialDataSelection"
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
        <div class="button-row">
          <!-- TODO: extract button-group to its own component -->
          <div class="button-group">
            <button class="btn btn-default"
                    :class="{'btn-primary':!isDescriptionView}"
                    @click="isDescriptionView = false">
              Data</button
            ><button class="btn btn-default"
                    :class="{'btn-primary':isDescriptionView}"
                    @click="isDescriptionView = true">
              Descriptions
            </button>
          </div>
          <div
            v-if="!isDescriptionView && selectedScenarioIds.length > 1"
            class="relative-box"
          >
            Relative to:
            <button
              class="btn btn-default"
              @click="isRelativeDropdownOpen = !isRelativeDropdownOpen"
              :style="{ color: relativeTo === null ? 'black' : colorFromIndex(relativeTo) }"
            >
              {{relativeTo === null ? 'none' : `Run ${relativeTo}`}}</button
            >
            <dropdown-control
              v-if="isRelativeDropdownOpen"
              class="relative-dropdown">
              <template #content>
                <div
                  class="dropdown-option"
                  @click="relativeTo = null; isRelativeDropdownOpen = false;"
                >
                  none
                </div>
                <div
                  v-for="(scenarioId, index) in selectedScenarioIds"
                  class="dropdown-option"
                  :style="{ color: colorFromIndex(index) }"
                  :key="index"
                  @click="relativeTo = index; isRelativeDropdownOpen = false;"
                >
                  Run {{index}}
                </div>
              </template>
            </dropdown-control>
          </div>
        </div>
        <slot name="datacube-description" v-if="isDescriptionView" />
        <header v-if="isExpanded && !isDescriptionView">
          <datacube-scenario-header
            v-if="mainModelOutput"
            class="scenario-header"
            :outputVariable="mainModelOutput.display_name"
            :outputVariableUnits="mainModelOutput.unit"
            :selected-model-id="selectedModelId"
            :selected-scenario-ids="selectedScenarioIds"
            :color-from-index="colorFromIndex"
          />
        </header>
        <div class="bookmark-capture" style="display: flex; flex-direction: column; flex: 1;">
          <div style="display: flex; flex-direction: row;">
            <slot name="temporal-aggregation-config" v-if="!isDescriptionView" />
            <slot name="temporal-resolution-config" v-if="!isDescriptionView" />
          </div>
          <timeseries-chart
            v-if="!isDescriptionView"
            class="timeseries-chart"
            :timeseries-data="selectedTimeseriesData"
            :selected-timestamp="selectedTimestamp"
            @select-timestamp="emitTimestampSelection"
          />
          <div style="display: flex; flex-direction: row;">
            <slot name="spatial-aggregation-config" v-if="!isDescriptionView" />
          </div>
          <data-analysis-map
            v-if="!isDescriptionView"
            class="card-map full-width"
            :output-source-specs="outputSourceSpecs"
            :output-selection=0
            :show-tooltip="true"
            :selected-admin-level="selectedAdminLevel"
            :filters="mapFilters"
            @on-map-load="onMapLoad"
            @slide-handle-change="onMapSlideChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, PropType, watch, toRefs, computed, Ref } from 'vue';

import DatacubeScenarioHeader from '@/components/data/datacube-scenario-header.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import timeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import ParallelCoordinatesChart from '@/components/widgets/charts/parallel-coordinates.vue';
import { ScenarioDef } from '@/types/Datacubes';
import { ScenarioData, AnalysisMapFilter } from '@/types/Common';
import DataAnalysisMap from '@/components/data/analysis-map-simple.vue';
import useTimeseriesData from '@/services/composables/useTimeseriesData';
import useParallelCoordinatesData from '@/services/composables/useParallelCoordinatesData';
import { colorFromIndex } from '@/utils/colors-util';
import API from '@/api/api';
import useModelMetadata from '@/services/composables/useModelMetadata';
import { Model, ModelFeature } from '@/types/Model';

export default defineComponent({
  name: 'DatacubeCard',
  emits: [
    'on-map-load',
    'set-selected-scenario-ids',
    'select-timestamp',
    'set-drilldown-data',
    'check-model-metadata-validity'
  ],
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
      type: String as PropType<string>,
      required: true
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
    },
    selectedTemporalResolution: {
      type: String as PropType<string>,
      default: 'month'
    },
    selectedTemporalAggregation: {
      type: String as PropType<string>,
      default: 'mean'
    },
    selectedSpatialAggregation: {
      type: String as PropType<string>,
      default: 'mean'
    }
  },
  components: {
    timeseriesChart,
    DatacubeScenarioHeader,
    Disclaimer,
    ParallelCoordinatesChart,
    DataAnalysisMap,
    DropdownControl
  },
  setup(props, { emit }) {
    const {
      selectedModelId,
      selectedScenarioIds,
      selectedTimestamp,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      allScenarioIds
    } = toRefs(props);

    const {
      timeseriesData: selectedTimeseriesData,
      relativeTo
    } = useTimeseriesData(
      selectedModelId,
      selectedScenarioIds,
      colorFromIndex,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation
    );

    const {
      dimensions,
      ordinalDimensionNames,
      drilldownDimensions,
      runParameterValues
    } = useParallelCoordinatesData(selectedModelId, allScenarioIds);

    const metadata = useModelMetadata(selectedModelId) as Ref<Model | null>;

    const mainModelOutput = ref<ModelFeature | undefined>(undefined);

    watch(() => metadata.value, () => {
      mainModelOutput.value = metadata.value?.outputs[0];
    }, {
      immediate: true
    });

    const isDescriptionView = ref<boolean>(true);

    watch(() => props.selectedScenarioIds, () => {
      relativeTo.value = null;
      isDescriptionView.value = props.selectedScenarioIds.length === 0;
    }, {
      immediate: true
    });

    function emitTimestampSelection(newTimestamp: number) {
      emit('select-timestamp', newTimestamp);
    }

    const outputSourceSpecs = computed(() => {
      return [{
        id: selectedScenarioIds.value[0],
        modelId: selectedModelId.value,
        runId: selectedScenarioIds.value[0], // we may not have a selected run at this point, so init map with the first run by default
        outputVariable: selectedModelId.value.includes('maxhop') ? 'Hopper Presence Prediction' : 'production',
        timestamp: selectedTimestamp.value,
        temporalResolution: selectedTemporalResolution.value,
        temporalAggregation: selectedTemporalAggregation.value,
        spatialAggregation: selectedSpatialAggregation.value
      }];
    });

    return {
      outputSourceSpecs,
      selectedTimeseriesData,
      colorFromIndex,
      emitTimestampSelection,
      relativeTo,
      dimensions,
      ordinalDimensionNames,
      drilldownDimensions,
      runParameterValues,
      isDescriptionView,
      mainModelOutput
    };
  },
  data: () => ({
    showBaselineDefaults: false,
    showNewRunsMode: false,
    initialDataSelection: [] as Array<string>,
    potentialScenarioCount: 0,
    isRelativeDropdownOpen: false,
    potentialScenarios: [] as Array<ScenarioData>,
    mapFilters: [] as Array<AnalysisMapFilter>
  }),
  methods: {
    onMapLoad() {
      this.$emit('on-map-load');
    },
    onMapSlideChange(data: AnalysisMapFilter) {
      this.mapFilters = [data];
    },
    toggleBaselineDefaultsVisibility() {
      this.showBaselineDefaults = !this.showBaselineDefaults;
    },
    toggleNewRunsMode() {
      this.showNewRunsMode = !this.showNewRunsMode;
      this.potentialScenarioCount = 0;

      if (this.showNewRunsMode) {
        // always force baselinedefault to be visible when the new-runs-mode is active
        this.showBaselineDefaults = true;
        // clear any selected scenario and show the model desc page
        this.updateScenarioSelection({ scenarios: [] });
      }
    },
    requestNewModelRuns() {
      // FIXME: cast to 'any' since typescript cannot see mixins yet!
      (this as any).toaster('New runs requested\nPlease check back later!');
      const firstScenario = this.potentialScenarios[0]; // FIXME
      const paramArray: any[] = [];
      Object.keys(firstScenario).forEach(key => {
        paramArray.push({
          name: key,
          value: +firstScenario[key]
        });
      });
      paramArray.push({
        name: 'country',
        value: 'Ethiopia'
      });
      API.post('maas/model-runs', {
        model_id: this.selectedModelId,
        model_name: 'MaxHop',
        parameters: paramArray
      });
    },
    updateScenarioSelection(e: { scenarios: Array<ScenarioDef> }) {
      if (
        e.scenarios.length === 0 ||
        (e.scenarios.length === 1 && e.scenarios[0] === undefined)
      ) {
        // console.log('no line is selected');
        this.$emit('set-selected-scenario-ids', []);
      } else {
        // console.log('user selected: ' + e.scenarios.length);
        this.$emit('set-selected-scenario-ids', e.scenarios.map(s => s.run_id));
      }
      // we should emit to update the drilldown data everytime scenario selection changes
      this.$emit('set-drilldown-data', { drilldownDimensions: this.drilldownDimensions });
    },
    updateGeneratedScenarios(e: { scenarios: Array<ScenarioData> }) {
      this.potentialScenarioCount = e.scenarios.length;
      this.potentialScenarios = e.scenarios;
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

.relative-box {
  position: relative;
}

.relative-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
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

.button-row {
  display: flex;
  justify-content: space-between;
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
