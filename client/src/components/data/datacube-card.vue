<template>
  <div class="datacube-card-container">
    <div class="insight-capture capture-box">
      <header>
        <slot name="datacube-model-header" />
        <slot name="datacube-model-header-collapse" />
      </header>
      <modal-new-scenario-runs
        v-if="isModelMetadata && showNewRunsModal === true"
        :metadata="metadata"
        :potential-scenarios="potentialScenarios"
        @close="onNewScenarioRunsModalClose" />
      <modal-check-runs-execution-status
        v-if="isModelMetadata & showModelRunsExecutionStatus === true"
        :metadata="metadata"
        :potential-scenarios="runParameterValues"
        @close="showModelRunsExecutionStatus = false" />
      <div class="flex-row">
        <!-- if has multiple scenarios -->
        <div v-if="isModelMetadata" class="scenario-selector">
          <div>
            <div class="checkbox">
              <label @click="toggleBaselineDefaultsVisibility()">
                <i
                  class="fa fa-lg fa-fw"
                  :class="{ 'fa-check-square-o': showBaselineDefaults, 'fa-square-o': !showBaselineDefaults }"
                />
                Default Values
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
            class="pc-chart"
            :dimensions-data="runParameterValues"
            :selected-dimensions="dimensions"
            :ordinal-dimensions="ordinalDimensionNames"
            :initial-data-selection="isDescriptionView ? [] : selectedScenarioIds"
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
              Review
            </button>
          </div>
          <div v-else>
            <button
              class="search-button btn btn-primary btn-call-for-action"
              @click="showModelExecutionStatus()"
            >
              Check execution status
            </button>
          </div>
        </div>
        <div class="column">
          <div class="button-row">
            <!-- TODO: extract button-group to its own component -->
            <div class="button-group">
              <button class="btn btn-default"
                      :class="{'btn-primary':isDescriptionView}"
                      @click="$emit('update-desc-view', true)">
                Descriptions
              </button>
              <!-- make 'Data' tab disabled when no scenario selection -->
              <button class="btn btn-default"
                      :class="{'btn-primary':!isDescriptionView}"
                      :disabled="selectedScenarioIds.length === 0"
                      @click="$emit('update-desc-view', false)">
                Data
              </button>
            </div>
            <div
              v-if="!isDescriptionView && (timeseriesData.length > 1 || relativeTo !== null)"
              class="relative-box"
            >
              Relative to:
              <button
                class="btn btn-default"
                @click="isRelativeDropdownOpen = !isRelativeDropdownOpen"
                :style="{ color: baselineMetadata?.color ?? 'black' }"
              >
                {{baselineMetadata?.name ?? 'none'}}</button
              >
              <dropdown-control
                v-if="isRelativeDropdownOpen"
                class="relative-dropdown">
                <template #content>
                  <div
                    v-if="relativeTo !== null"
                    class="dropdown-option"
                    @click="emitRelativeToSelection(null); isRelativeDropdownOpen = false;"
                  >
                    none
                  </div>
                  <div
                    v-for="(timeseries, index) in timeseriesData"
                    class="dropdown-option"
                    :style="{ color: timeseries.color }"
                    :key="index"
                    @click="emitRelativeToSelection(timeseries.id); isRelativeDropdownOpen = false;"
                  >
                    {{timeseries.name}}
                  </div>
                </template>
              </dropdown-control>
            </div>
          </div>
          <slot name="datacube-description" v-if="isDescriptionView" />
          <header v-if="isExpanded && !isDescriptionView">
            <datacube-scenario-header
              v-if="mainModelOutput && isModelMetadata"
              class="scenario-header"
              :outputVariable="mainModelOutput.display_name"
              :outputVariableUnits="mainModelOutput.unit && mainModelOutput.unit !== '' ? mainModelOutput.unit : mainModelOutput.units"
              :metadata="metadata"
              :selected-scenario-ids="selectedScenarioIds"
              :color-from-index="colorFromIndex"
            />
          </header>
          <div class="column">
            <div style="display: flex; flex-direction: row;">
              <slot
                name="temporal-aggregation-config"
                v-if="!isDescriptionView && timeseriesData.length > 0"
              />
              <slot
                name="temporal-resolution-config"
                v-if="!isDescriptionView && timeseriesData.length > 0"
              />
            </div>
            <timeseries-chart
              v-if="!isDescriptionView && timeseriesData.length > 0"
              class="timeseries-chart"
              :timeseries-data="timeseriesData"
              :selected-timestamp="selectedTimestamp"
              :breakdown-option="breakdownOption"
              @select-timestamp="emitTimestampSelection"
            />
            <p
              v-if="
                !isDescriptionView &&
                breakdownOption === SpatialAggregationLevel.Region &&
                timeseriesData.length === 0
              "
            >
              Please select one or more regions, or choose 'Split by none'.
            </p>
            <div
              v-if="!isDescriptionView && mapReady && regionalData !== null && outputSourceSpecs.length > 0"
              style="display: flex; flex-direction: row;"
            >
              <slot name="spatial-aggregation-config" v-if="!isDescriptionView" />
            </div>
            <div
              v-if="mapReady && !isDescriptionView && regionalData !== null"
              class="card-maps-container">
              <div
                v-for="(spec, indx) in outputSourceSpecs"
                :key="spec.id"
                class="card-map-container"
                :class="[
                  `card-count-${outputSourceSpecs.length < 5 ? outputSourceSpecs.length : 'n'}`
                ]"
              >
                <span
                  v-if="outputSourceSpecs.length > 1"
                  :style="{ color: colorFromIndex(indx)}"
                >
                  {{ selectedTimeseriesPoints[indx]?.timeseriesName ?? '--' }}
                </span>

                <data-analysis-map
                  class="card-map"
                  :style="{ borderColor: colorFromIndex(indx) }"
                  :output-source-specs="outputSourceSpecs"
                  :output-selection=spec.id
                  :relative-to="relativeTo"
                  :show-tooltip="true"
                  :selected-layer-id="mapSelectedLayer"
                  :filters="mapFilters"
                  :map-bounds="mapBounds"
                  :region-data="regionalData"
                  :grid-layer-stats="gridLayerStats"
                  :selected-base-layer="selectedBaseLayer"
                  @sync-bounds="onSyncMapBounds"
                  @on-map-load="onMapLoad"
                  @slide-handle-change="updateMapFilters"
                />
              </div>
            </div>
            <div
              v-else-if="!isDescriptionView"
              class="card-maps-container"
            >
              <!-- Empty div to reduce jumpiness when the maps are loading -->
              <div class="card-map" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, ref, PropType, watch, toRefs, computed, watchEffect } from 'vue';
import DatacubeScenarioHeader from '@/components/data/datacube-scenario-header.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import timeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import Disclaimer from '@/components/widgets/disclaimer.vue';
import ParallelCoordinatesChart from '@/components/widgets/charts/parallel-coordinates.vue';
import { ModelRun } from '@/types/ModelRun';
import { ScenarioData, AnalysisMapFilter } from '@/types/Common';
import DataAnalysisMap from '@/components/data/analysis-map-simple.vue';
import useParallelCoordinatesData from '@/services/composables/useParallelCoordinatesData';
import { getOutputStats } from '@/services/runoutput-service';
import { colorFromIndex } from '@/utils/colors-util';
import { Model, DatacubeFeature, Indicator } from '@/types/Datacube';
import ModalNewScenarioRuns from '@/components/modals/modal-new-scenario-runs.vue';
import ModalCheckRunsExecutionStatus from '@/components/modals/modal-check-runs-execution-status.vue';
import { ModelRunStatus, SpatialAggregationLevel, TemporalAggregationLevel } from '@/types/Enums';
import { enableConcurrentTileRequestsCaching, disableConcurrentTileRequestsCaching, ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';
import { OutputSpecWithId, RegionalAggregations, OutputStatsResult } from '@/types/Runoutput';
import { useStore } from 'vuex';
import { isModel } from '@/utils/datacube-util';
import { Timeseries, TimeseriesPointSelection } from '@/types/Timeseries';
import dateFormatter from '@/formatters/date-formatter';
import { getTimestampMillis } from '@/utils/date-util';
import { DATA_LAYER } from '@/utils/map-util-new';

export default defineComponent({
  name: 'DatacubeCard',
  emits: [
    'on-map-load',
    'set-selected-scenario-ids',
    'select-timestamp',
    'set-drilldown-data',
    'check-model-metadata-validity',
    'refetch-data',
    'new-runs-mode',
    'update-desc-view',
    'set-relative-to'
  ],
  props: {
    isExpanded: {
      type: Boolean,
      default: true
    },
    isDescriptionView: {
      type: Boolean,
      default: true
    },
    selectedAdminLevel: {
      type: Number,
      default: 0
    },
    allModelRunData: {
      type: Array as PropType<ModelRun[]>,
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
    regionalData: {
      type: Object as PropType<RegionalAggregations | null>,
      default: null
    },
    outputSourceSpecs: {
      type: Array as PropType<OutputSpecWithId[]>,
      default: () => []
    },
    metadata: {
      type: Object as PropType<Model | Indicator | null>,
      default: null
    },
    timeseriesData: {
      type: Array as PropType<Timeseries[]>,
      default: []
    },
    relativeTo: {
      type: String as PropType<string | null>,
      default: null
    },
    breakdownOption: {
      type: String as PropType<string | null>,
      default: null
    },
    baselineMetadata: {
      type: Object as PropType<{name: string; color: string} | null>,
      default: null
    },
    selectedTimeseriesPoints: {
      type: Array as PropType<TimeseriesPointSelection[]>,
      default: []
    },
    selectedBaseLayer: {
      type: String,
      required: true
    },
    selectedDataLayer: {
      type: String,
      required: true
    }
  },
  components: {
    timeseriesChart,
    DatacubeScenarioHeader,
    Disclaimer,
    ParallelCoordinatesChart,
    DataAnalysisMap,
    DropdownControl,
    ModalNewScenarioRuns,
    ModalCheckRunsExecutionStatus
  },
  setup(props, { emit }) {
    const store = useStore();
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const currentOutputIndex = computed(() => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);

    const {
      selectedScenarioIds,
      allModelRunData,
      metadata,
      breakdownOption,
      outputSourceSpecs
    } = toRefs(props);

    const emitTimestampSelection = (newTimestamp: number) => {
      emit('select-timestamp', newTimestamp);
    };

    const emitRelativeToSelection = (newValue: number | null) => {
      emit('set-relative-to', newValue);
    };

    const {
      dimensions,
      ordinalDimensionNames,
      drilldownDimensions,
      runParameterValues
    } = useParallelCoordinatesData(metadata, allModelRunData);

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);

    watchEffect(() => {
      if (metadata.value && currentOutputIndex.value >= 0) {
        const outputs = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;
        mainModelOutput.value = outputs[currentOutputIndex.value];
      }
    });

    const isModelMetadata = computed(() => {
      return metadata.value !== null && isModel(metadata.value);
    });

    const gridLayerStats = ref<OutputStatsResult[]>([]);

    watchEffect(async onInvalidate => {
      if (outputSourceSpecs.value.length === 0) return;
      let isCancelled = false;
      onInvalidate(() => {
        isCancelled = true;
      });
      const result = await getOutputStats(outputSourceSpecs.value);
      if (isCancelled) return;
      gridLayerStats.value = result;
    });

    const mapFilters = ref<AnalysisMapFilter[]>([]);
    const updateMapFilters = (data: AnalysisMapFilter) => {
      mapFilters.value = [...mapFilters.value.filter(d => d.id !== data.id), data];
    };
    // When the list of selected scenario IDs changes, remove any map filters
    //  that no longer apply to any of the selected scenarios
    watch(
      () => selectedScenarioIds.value,
      () => {
        mapFilters.value = mapFilters.value.filter(filter => {
          return selectedScenarioIds.value.find(scenarioId => filter.id === scenarioId);
        });
      }
    );

    const timestampFormatter = (timestamp: number) => {
      if (breakdownOption.value === TemporalAggregationLevel.Year) {
        const month = timestamp;
        // We're only displaying the month, so the year doesn't matter
        return dateFormatter(getTimestampMillis(1970, month), 'MMMM');
      }
      return dateFormatter(timestamp, 'MMMM YYYY');
    };

    return {
      gridLayerStats,
      updateMapFilters,
      mapFilters,
      colorFromIndex,
      emitTimestampSelection,
      dimensions,
      ordinalDimensionNames,
      drilldownDimensions,
      runParameterValues,
      mainModelOutput,
      isModelMetadata,
      emitRelativeToSelection,
      timestampFormatter,
      SpatialAggregationLevel
    };
  },
  data: () => ({
    showBaselineDefaults: true,
    showNewRunsMode: false,
    potentialScenarioCount: 0,
    isRelativeDropdownOpen: false,
    potentialScenarios: [] as Array<ScenarioData>,
    showNewRunsModal: false,
    showModelRunsExecutionStatus: false,
    mapBounds: [ // Default bounds to Ethiopia
      [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
      [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
    ],
    mapReady: false
  }),
  created() {
    enableConcurrentTileRequestsCaching().then(() => (this.mapReady = true));
  },
  unmounted() {
    disableConcurrentTileRequestsCaching();
  },
  computed: {
    mapSelectedLayer(): number {
      return this.selectedDataLayer === DATA_LAYER.TILES ? 4 : this.selectedAdminLevel;
    }
  },
  methods: {
    onMapLoad() {
      this.$emit('on-map-load');
    },
    onSyncMapBounds(mapBounds: Array<Array<number>>) {
      this.mapBounds = mapBounds;
    },
    toggleBaselineDefaultsVisibility() {
      this.showBaselineDefaults = !this.showBaselineDefaults;
    },
    toggleNewRunsMode() {
      // reset visibility of baselinedefault when toggling the new-runs-mode
      this.showBaselineDefaults = false;

      this.showNewRunsMode = !this.showNewRunsMode;
      this.potentialScenarioCount = 0;

      if (this.showNewRunsMode) {
        // always force baselinedefault to be visible when the new-runs-mode is active
        this.showBaselineDefaults = true;
        // clear any selected scenario and show the model desc page
        this.updateScenarioSelection({ scenarios: [] });
      }
      this.$emit('new-runs-mode', { newRunsMode: this.showNewRunsMode });
    },
    requestNewModelRuns() {
      this.showNewRunsModal = true;
    },
    onNewScenarioRunsModalClose (status: any) {
      this.showNewRunsModal = false;
      if (status.cancel === false) {
        // execution has just started for some new runs so start the hot-reload cycle
        // first, exit new-runs-mode
        this.toggleNewRunsMode();
        // then, re-fetch data from server (wait some time to give the server a chance to update)
        _.delay(() => this.$emit('refetch-data'), 2000);
      }
    },
    showModelExecutionStatus() {
      this.showModelRunsExecutionStatus = true;
    },
    updateScenarioSelection(e: { scenarios: Array<ScenarioData> }) {
      const selectedScenarios = e.scenarios.filter(s => s.status === ModelRunStatus.Ready);
      if (selectedScenarios.length === 0) {
        // console.log('no line is selected');
        this.$emit('set-selected-scenario-ids', []);
      } else {
        // console.log('user selected: ' + e.scenarios.length);
        this.$emit('set-selected-scenario-ids', selectedScenarios.map(s => s.run_id));
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
  background-color: $background-light-1;
  box-shadow: $shadow-level-1;
  border-radius: 3px;
  display: flex;
}
.capture-box {
  padding: 10px;
  display: flex;
  width: 100%;
  flex-direction: column;
}

.flex-row {
  display: flex;
  flex: 1;
  min-height: 0;
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
  display: flex;
  flex-direction: column;
}

.pc-chart {
  flex: 1;
  min-height: 0;
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
  min-height: 0;
}


.card-maps-container {
  min-height: 0;
  flex: 3;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  overflow-y: auto;
  width: 100%;
  position: relative;
}

$marginSize: 5px;

.card-map-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;

  ::v-deep(.wm-map) {
    border-style: solid;
    border-color: inherit;
  }
  &.card-count-1 {
    ::v-deep(.wm-map) {
      border: none;
    }
  }
  &.card-count-3,
  &.card-count-4 {
    height: 50%;
    min-width: calc(50% - #{$marginSize / 2});
    max-width: calc(50% - #{$marginSize / 2});
  }
  &.card-count-n {
    height: 50%;
    min-width: calc(calc(100% / 3) - #{$marginSize * 2 / 3});
    max-width: calc(calc(100% / 3) - #{$marginSize * 2 / 3});
  }
}

.card-map {
  flex-grow: 1;
  min-height: 0;
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

.hidden-timeseries-message {
  margin: 15px 0;

  .timestamp {
    color: $selected-dark;
  }
}
</style>
