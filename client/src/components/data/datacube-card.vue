<template>
  <div class="datacube-card-container">
    <div class="capture-box">
      <header>
        <slot name="datacube-model-header" />
        <slot name="datacube-model-header-collapse" />
      </header>
      <modal-new-scenario-runs
        v-if="isModelMetadata && showNewRunsModal === true"
        :metadata="metadata"
        :potential-scenarios="potentialScenarios"
        :selected-dimensions="dimensions"
        @close="onNewScenarioRunsModalClose" />
      <modal-check-runs-execution-status
        v-if="isModelMetadata & showModelRunsExecutionStatus === true"
        :metadata="metadata"
        :potential-scenarios="runParameterValues"
        @close="showModelRunsExecutionStatus = false" />
      <div class="flex-row">
        <!-- if has multiple scenarios -->
        <div v-if="isModelMetadata" class="scenario-selector">
          <parallel-coordinates-chart
            class="pc-chart"
            :dimensions-data="runParameterValues"
            :selected-dimensions="dimensions"
            :ordinal-dimensions="ordinalDimensionNames"
            :initial-data-selection="selectedScenarioIds"
            :new-runs-mode="showNewRunsMode"
            @select-scenario="updateScenarioSelection"
            @generated-scenarios="updateGeneratedScenarios"
          />
          <button
            class="btn toggle-new-runs-button"
            :class="{
              'btn-primary btn-call-for-action': !showNewRunsMode,
              'btn-default': showNewRunsMode
            }"
            @click="toggleNewRunsMode()"
          >
            {{ showNewRunsMode ? 'Cancel' : 'Request new runs' }}
          </button>
          <button
            v-if="showNewRunsMode"
            class="btn btn-primary btn-call-for-action"
            :class="{ 'disabled': potentialScenarioCount === 0}"
            @click="requestNewModelRuns()"
          >
            Review {{ potentialScenarioCount }} new scenario{{ potentialScenarioCount !== 1 ? 's' : '' }}
          </button>
          <button
            v-else
            class="btn btn-default"
            @click="showModelExecutionStatus()"
          >
            Check execution status
          </button>
        </div>
        <div class="column">
          <div class="button-row">
            <div class="button-row-group">
              <radio-button-group
                :selected-button-value="currentTabView"
                :buttons="headerGroupButtons"
                @button-clicked="onTabClick"
              />
              <small-text-button
                v-if="dataPaths.length > 0"
                :label="'Download raw data'"
                @click="showDatasets = true"
              />
            </div>
            <div
              v-if="currentTabView === 'data' && (timeseriesData.length > 1 || relativeTo !== null)"
              class="relative-box"
            >
              Relative to
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

          <!-- Description tab content -->
          <slot name="datacube-description" v-if="currentTabView === 'description'" />

          <!-- Pre-rendered viz tab content -->
          <!--
            outputSourceSpecs.length > 0 means we have one or more selected run
            FIXME: this should be done directly against allModelRunData
           -->
          <div
            v-if="currentTabView === 'pre-rendered-viz' && outputSourceSpecs.length > 0"
            style="display: flex; height: 100%; flex-direction: column">

            <!-- a global list
              of all pre-rendered-viz items from all runs,
              and enable selection by item name/id instead of index
              which won't work when different model runs have different list of pre-rendered items -->
            <div v-if="preGenDataItems.length > 0"
              style="display: flex; padding: 5px;">
              <div style="padding-right: 10px">Selected Viz:</div>
              <select name="pre-gen-outputs" @change="selectedPreGenDataItem=preGenDataItems[$event.target.selectedIndex]">
                <option
                  v-for="pregenItem in preGenDataItems" :key="pregenItem"
                  :selected="pregenItem === selectedPreGenDataItem"
                >
                  {{pregenItem}}
                </option>
              </select>
            </div>

            <div class="column card-maps-container" style="flex-direction: revert;">
              <div v-for="(spec, indx) in outputSourceSpecs" :key="spec.id" :set="pregenDataForSpec = getSelectedPreGenOutput(spec)"
                class="card-map-container"
                :style="{ borderColor: colorFromIndex(indx) }"
                style="border-width: 2px; border-style: solid;"
                :class="[
                  `card-count-${outputSourceSpecs.length < 5 ? outputSourceSpecs.length : 'n'}`
                ]"
              >
                <!-- spec here represents one selected model run -->
                <template v-if="spec.preGeneratedOutput && pregenDataForSpec !== undefined" >
                  <!-- display only a single pre-rendered-viz item for each selected run -->
                  <img
                    v-if="pregenDataForSpec.type === 'image'"
                    :src="pregenDataForSpec.file"
                    alt="Pre-rendered Visualization"
                    class="pre-rendered-content"
                  >
                  <video
                    v-if="pregenDataForSpec.type === 'video'"
                    controls muted
                    class="pre-rendered-content"
                    :src="pregenDataForSpec.file"
                  >
                  </video>
                </template>
                <template v-else>
                  No pre-generated data available for some selected scenario(s)!
                </template>
              </div>
            </div>
          </div>

          <datacube-scenario-header
            v-if="isExpanded && currentTabView === 'data' && mainModelOutput && isModelMetadata"
            :metadata="metadata"
            :selected-scenario-ids="selectedScenarioIds"
            :color-from-index="colorFromIndex"
          />
          <modal v-if="showDatasets">
            <template #header>
              <h4 class="header"> Parquet files used to populate this datacube </h4>
            </template>
            <template #body>
              <div v-for="dataPath in dataPaths" :key="dataPath">
                <a class="dataset-link" :href=dataPath>{{ dataPath.length > 50 ? dataPath.slice(0, 50) + '...' : dataPath }}</a>
                <br/>
                <br/>
              </div>
              <p>
                <a href="https://github.com/uncharted-causemos/parquet-to-csv">View code used to process the parquet files.</a>
              </p>
            </template>
            <template #footer>
              <div
                class="btn btn-primary btn-call-for-action"
                @click="showDatasets = false"
              >
                Close
              </div>
            </template>
          </modal>

          <!-- Data tab content -->
          <div v-if="currentTabView === 'data'" class="column">
            <div class="dropdown-row">
              <slot
                name="temporal-aggregation-config"
                v-if="currentTabView === 'data' && timeseriesData.length > 0"
              />
              <slot
                name="temporal-resolution-config"
                v-if="currentTabView === 'data' && timeseriesData.length > 0"
              />
            </div>
            <timeseries-chart
              v-if="currentTabView === 'data' && timeseriesData.length > 0"
              class="timeseries-chart"
              :timeseries-data="timeseriesData"
              :selected-temporal-resolution="selectedTemporalResolution"
              :selected-timestamp="selectedTimestamp"
              :breakdown-option="breakdownOption"
              :unit="mainModelOutput?.unit"
              @select-timestamp="emitTimestampSelection"
            />
            <p
              v-if="
                currentTabView === 'data' &&
                breakdownOption !== null &&
                timeseriesData.length === 0
              "
            >
              Please select one or more
              {{
                breakdownOption === SpatialAggregationLevel.Region
                  ? 'regions'
                  : breakdownOption === TemporalAggregationLevel.Year
                  ? 'years'
                  : 'qualifier values'
              }}
              , or choose 'Split by none'.
            </p>
            <div
              v-if="currentTabView === 'data' && mapReady && regionalData !== null && outputSourceSpecs.length > 0"
              class="dropdown-row"
            >
              <slot name="spatial-aggregation-config" v-if="currentTabView === 'data'" />
            </div>
            <div class="card-maps-box">
              <div
                v-if="mapReady && currentTabView === 'data' && regionalData !== null"
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
                    :map-bounds="mapBounds"
                    :region-data="regionalData"
                    :admin-layer-stats="adminLayerStats"
                    :grid-layer-stats="gridLayerStats"
                    :selected-base-layer="selectedBaseLayer"
                    :unit="unit"
                    @sync-bounds="onSyncMapBounds"
                    @on-map-load="onMapLoad"
                    @zoom-change="updateMapCurSyncedZoom"
                    @map-update="recalculateGridMapDiffStats"
                  />
                </div>
              </div>
              <div
                v-else-if="currentTabView === 'data'"
                class="card-maps-container"
              >
                <!-- Empty div to reduce jumpiness when the maps are loading -->
                <div class="card-map" />
              </div>
              <div v-if="outputSourceSpecs.length > 0" class="card-maps-legend-container">
                <div v-for="(data, index) in (isGridLayer ? gridMapLayerLegendData : adminMapLayerLegendData)" :key="index">
                  <map-legend :ramp="data" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { defineComponent, ref, PropType, toRefs, computed, watchEffect, Ref } from 'vue';
import DatacubeScenarioHeader from '@/components/data/datacube-scenario-header.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import timeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import ParallelCoordinatesChart from '@/components/widgets/charts/parallel-coordinates.vue';
import { ModelRun, PreGeneratedModelRunData } from '@/types/ModelRun';
import { ScenarioData } from '@/types/Common';
import DataAnalysisMap from '@/components/data/analysis-map-simple.vue';
import useParallelCoordinatesData from '@/services/composables/useParallelCoordinatesData';
import useAnalysisMaps from '@/services/composables/useAnalysisMaps';
import { colorFromIndex } from '@/utils/colors-util';
import { Model, DatacubeFeature, Indicator } from '@/types/Datacube';
import Modal from '@/components/modals/modal.vue';
import ModalNewScenarioRuns from '@/components/modals/modal-new-scenario-runs.vue';
import ModalCheckRunsExecutionStatus from '@/components/modals/modal-check-runs-execution-status.vue';
import { ModelRunStatus, SpatialAggregationLevel, TemporalAggregationLevel } from '@/types/Enums';
import { enableConcurrentTileRequestsCaching, disableConcurrentTileRequestsCaching } from '@/utils/map-util';
import { OutputSpecWithId, RegionalAggregations } from '@/types/Runoutput';
import { useStore } from 'vuex';
import { isIndicator, isModel } from '@/utils/datacube-util';
import { Timeseries, TimeseriesPointSelection } from '@/types/Timeseries';
import SmallTextButton from '@/components/widgets/small-text-button.vue';
import RadioButtonGroup from '../widgets/radio-button-group.vue';
import MapLegend from '@/components/widgets/map-legend.vue';

export default defineComponent({
  name: 'DatacubeCard',
  emits: [
    'on-map-load',
    'set-selected-scenario-ids',
    'select-timestamp',
    'check-model-metadata-validity',
    'refetch-data',
    'new-runs-mode',
    'update-tab-view',
    'set-relative-to'
  ],
  props: {
    isExpanded: {
      type: Boolean,
      default: true
    },
    currentTabView: {
      type: String,
      default: 'description'
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
    selectedTemporalResolution: {
      type: String,
      default: ''
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
    },
    unit: {
      type: String as PropType<string>,
      default: null
    }
  },
  components: {
    timeseriesChart,
    DatacubeScenarioHeader,
    ParallelCoordinatesChart,
    DataAnalysisMap,
    DropdownControl,
    ModalNewScenarioRuns,
    ModalCheckRunsExecutionStatus,
    Modal,
    SmallTextButton,
    RadioButtonGroup,
    MapLegend
  },
  setup(props, { emit }) {
    const store = useStore();
    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const currentOutputIndex = computed(() => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);
    const tour = computed(() => store.getters['tour/tour']);

    const {
      allModelRunData,
      metadata,
      outputSourceSpecs,
      regionalData,
      relativeTo,
      selectedDataLayer,
      selectedAdminLevel
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

    const headerGroupButtons = ref([
      { label: 'Descriptions', value: 'description' },
      { label: 'Data', value: 'data' },
      { label: 'Media', value: 'pre-rendered-viz' }
    ]) as Ref<{label: string; value: string}[]>;
    watchEffect(() => {
      const headerGroupButtonsSimple = [
        { label: 'Descriptions', value: 'description' },
        { label: 'Data', value: 'data' }
      ];
      // indicators should not have the 'Media' tab
      const isIndicatorDatacube = metadata.value !== null && isIndicator(metadata.value);
      if (isIndicatorDatacube) {
        headerGroupButtons.value = headerGroupButtonsSimple;
      }
      // models with no pre-generated data should not have the 'Media' tab
      if (allModelRunData.value !== null && allModelRunData.value.length > 0) {
        const runsWithPreGenDataAvailable = _.some(allModelRunData.value, r => r.pre_gen_output_paths && _.some(r.pre_gen_output_paths, p => p.coords === undefined));
        if (!runsWithPreGenDataAvailable) {
          headerGroupButtons.value = headerGroupButtonsSimple;
        }
      }
    });

    const preGenDataMap = ref<{[key: string]: PreGeneratedModelRunData[]}>({}); // map all pre-gen data for each run
    const preGenDataItems = ref<string[]>([]);
    const selectedPreGenDataItem = ref('');
    watchEffect(() => {
      if (allModelRunData.value !== null && allModelRunData.value.length > 0) {
        // build a map of all pre-gen data indexed by run-id
        preGenDataMap.value = Object.assign({}, ...allModelRunData.value.map((r) => ({ [r.id]: r.pre_gen_output_paths })));
        if (Object.keys(preGenDataMap.value).length > 0) {
          // note that some runs may not have valid pre-gen data (i.e., null)
          const allPreGenData = Object.values(preGenDataMap.value).flat().filter(p => p !== null && p !== undefined);

          // assing each pre-gen data item (within each run) an id
          allPreGenData.forEach(pregen => {
            pregen.id = getPreGenItemDisplayName(pregen);
          });

          // dropdown selection utilize each pre-gen data item id as it display name
          preGenDataItems.value = _.uniq(allPreGenData.map(pregen => pregen.id ?? ''));

          // select first pre-gen data item once available
          if (preGenDataItems.value.length > 0) {
            selectedPreGenDataItem.value = preGenDataItems.value[0];
          }
        }
      }
    });

    function getPreGenItemDisplayName(pregen: PreGeneratedModelRunData) {
      // @REVIEW: use the resource file name
      const lastSlashIndx = pregen.file.lastIndexOf('/');
      return pregen.file.substring(lastSlashIndx + 1);
    }

    function getSelectedPreGenOutput(spec: OutputSpecWithId): PreGeneratedModelRunData | undefined {
      return preGenDataMap.value[spec.id] ? preGenDataMap.value[spec.id].find(pregen => getPreGenItemDisplayName(pregen) === selectedPreGenDataItem.value) : undefined;
    }

    const validModelRunsAvailable = computed(() => {
      return (!_.isNull(metadata.value) && isIndicator(metadata.value)) || (!_.isNull(allModelRunData.value) &&
        !_.isNull(metadata.value) && isModel(metadata.value) &&
        _.some(allModelRunData.value, r => r.status === ModelRunStatus.Ready));
    });

    const {
      onSyncMapBounds,
      mapBounds,
      updateMapCurSyncedZoom,
      recalculateGridMapDiffStats,
      adminLayerStats,
      gridLayerStats,
      gridMapLayerLegendData,
      adminMapLayerLegendData,
      isGridLayer,
      mapSelectedLayer
    } = useAnalysisMaps(outputSourceSpecs, regionalData, relativeTo, selectedDataLayer, selectedAdminLevel);

    return {
      mapBounds,
      onSyncMapBounds,
      isGridLayer,
      mapSelectedLayer,
      recalculateGridMapDiffStats,
      updateMapCurSyncedZoom,
      adminLayerStats,
      gridLayerStats,
      adminMapLayerLegendData,
      gridMapLayerLegendData,
      colorFromIndex,
      emitTimestampSelection,
      dimensions,
      ordinalDimensionNames,
      runParameterValues,
      mainModelOutput,
      isModelMetadata,
      emitRelativeToSelection,
      SpatialAggregationLevel,
      TemporalAggregationLevel,
      validModelRunsAvailable,
      tour,
      headerGroupButtons,
      preGenDataItems,
      selectedPreGenDataItem,
      getSelectedPreGenOutput
    };
  },
  data: () => ({
    showDatasets: false,
    showNewRunsMode: false,
    potentialScenarioCount: 0,
    isRelativeDropdownOpen: false,
    potentialScenarios: [] as Array<ScenarioData>,
    showNewRunsModal: false,
    showModelRunsExecutionStatus: false,
    mapReady: false
  }),
  created() {
    enableConcurrentTileRequestsCaching().then(() => (this.mapReady = true));
  },
  unmounted() {
    disableConcurrentTileRequestsCaching();
  },
  mounted() {
  },
  computed: {
    dataPaths(): string[] {
      if (!_.isNull(this.metadata)) {
        const isAModel: boolean = isModel(this.metadata);
        return _.compact(isAModel
          ? this.allModelRunData
            .filter(modelRun => this.selectedScenarioIds.indexOf(modelRun.id) >= 0)
            .flatMap(modelRun => _.head(modelRun.data_paths))
          : isIndicator(this.metadata) ? this.metadata.data_paths : []
        );
      } else {
        return [];
      }
    }
  },
  methods: {
    onTabClick(value: string) {
      if (value === 'description' && this.isModelMetadata) {
        this.$emit('set-selected-scenario-ids', []); // this will update the 'currentTabView'
      }
      this.clickData(value);
    },
    clickData(tab: string) {
      // FIXME: This code to select a model run when switching to the data tab
      //  should be in a watcher on the parent component to be more robust,
      //  rather than in this button's click handler.
      this.$emit('update-tab-view', tab);

      if (this.isModelMetadata && this.selectedScenarioIds.length === 0) {
        // clicking on either the 'data' or 'pre-rendered-viz' tabs when no runs is selected should always pick the baseline run
        const readyRuns = this.allModelRunData.filter(r => r.status === ModelRunStatus.Ready && r.is_default_run);
        if (readyRuns.length === 0) {
          console.warn('cannot find a baseline model run indicated by the is_default_run');
          // failed to find baseline using the 'is_default_run' flag
          // FIXME: so, try to find a model run that has values matching the default values of all inputs
        }
        const newIds = readyRuns.map(run => run.id).slice(0, 1);
        this.$emit('set-selected-scenario-ids', newIds);
      }

      //
      // advance the relevant tour if it is active
      //
      if (tab === 'data' && this.tour && this.tour.id.startsWith('aggregations-tour')) {
        this.tour.next();
      }
    },
    onMapLoad() {
      this.$emit('on-map-load');
    },
    toggleNewRunsMode() {
      this.showNewRunsMode = !this.showNewRunsMode;
      this.potentialScenarioCount = 0;

      if (this.showNewRunsMode) {
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
        const selectedRunIDs = selectedScenarios.map(s => s.run_id);
        this.$emit('set-selected-scenario-ids', selectedRunIDs);
      }
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

.dataset-link {
  text-decoration: underline;
}

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

.toggle-new-runs-button {
  margin-bottom: 5px;
}

.relative-box {
  position: relative;
}

.relative-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
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

.pre-rendered-content {
  max-width: 100%;
}

.card-maps-box {
  flex: 3;
  min-width: 0;
  display: flex;
  flex-direction: row;
}

.card-map-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
}

.card-maps-legend-container {
    display: flex;
    flex-direction: column;
    div {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }
    div:nth-child(2) {
      margin-top: 30px;
    }
}

.card-map-container {
  flex-grow: 1;
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
  &.card-count-2,
  &.card-count-3,
  &.card-count-4 {
    min-width: calc(50% - #{$marginSize / 2});
    max-width: calc(50% - #{$marginSize / 2});
  }
  &.card-count-n {
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
  align-items: center;
  margin-top: 5px;
}

.button-row-group {
  display: flex;
  align-items: center;

  & > *:not(:first-child) {
    margin-left: 10px;
  }
}

.dropdown-row {
  display: flex;
  margin-top: 5px;
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
.map-legend-container {
  ::v-deep(.color-label) {
    span:nth-child(2) {
      position: relative;
      bottom: -16px;
    }
  }
}
</style>
