<template>
  <div class="datacube-card-parent">
    <div class="datacube-card-container">
      <div class="capture-box">
        <header>
          <slot name="datacube-model-header" />
          <button
            class="btn btn-default breakdown-button"
            :onClick="() => activeDrilldownTab = (activeDrilldownTab === null ? 'breakdown' : null)"
          >
            {{ activeDrilldownTab === null ? 'Show' : 'Hide' }} Breakdown
          </button>
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
          @close="showModelRunsExecutionStatus = false"
          @delete="prepareDelete"
          @retry="retryRun"
        />
        <modal-geo-selection
          v-if="showGeoSelectionModal === true"
          :model-param="geoModelParam"
          @close="onGeoSelectionModalClose" />
        <rename-modal
          v-if="showTagNameModal"
          :modal-title="`Add new tag to ${selectedScenarioIds.length} selected run${selectedScenarioIds.length !== 1 ? 's' : ''}`"
          @confirm="addNewTag"
          @cancel="showTagNameModal = false"
        />
        <div class="flex-row">
          <!-- if has multiple scenarios -->
          <div v-if="isModelMetadata" class="scenario-selector">
            <div class="tags-area-container">
              <span class="scenario-count" v-if="selectedScenarioIds.length === 0">
                {{scenarioCount}} model run{{scenarioCount === 1 ? '' : 's'}}.
              </span>
              <span class="scenario-count" v-if="selectedScenarioIds.length > 0">
                {{selectedScenarioIds.length}} model run{{selectedScenarioIds.length === 1 ? '' : 's'}} selected.
              </span>
              <span v-if="selectedScenarioIds.length > 0">Tags:</span>
              <small-text-button
                v-for="(tag, index) in tagsSharedBySelectedRuns"
                v-tooltip="'Remove from selected run' + (selectedScenarioIds.length === 1 ? '' : 's')"
                :key="index"
                :label="tag"
                @click="removeTagFromSelectedRuns(tag)"
              >
                <template #trailing>
                  <i class="fa fa-close" />
                </template>
              </small-text-button>
              <small-text-button
                v-if="selectedScenarioIds.length > 0"
                v-tooltip="'Add to selected run' + (selectedScenarioIds.length === 1 ? '' : 's')"
                :label="`Add tag`"
                @click="showTagNameModal = true"
              >
                <template #leading>
                  <i class="fa fa-plus-circle" />
                </template>
              </small-text-button>
            </div>
            <model-runs-search-bar
              class="model-runs-search-bar"
              v-if="isModelMetadata"
              :data="modelRunsSearchData"
              :filters="searchFilters"
              @filters-updated="onModelRunsFiltersUpdated"
            />
            <div v-if="dateModelParam">
              <div v-if="newRunsMode" ref="datePickerElement" class="new-runs-date-picker-container">
                <input class="date-picker-input" :placeholder="dateModelParam.type === DatacubeGenericAttributeVariableType.DateRange ? 'Select date range..' : 'Select date..'" type="text" v-model="dateParamPickerValue" autocomplete="off" data-input />
                <a class="btn btn-default date-picker-buttons" title="toggle" data-toggle>
                    <i class="fa fa-calendar"></i>
                </a>
                <a class="btn btn-default date-picker-buttons" title="clear" data-clear>
                    <i class="fa fa-close"></i>
                </a>
              </div>
              <temporal-facet
                v-else
                :model-run-data="filteredRunData"
                :selected-scenarios="selectedScenarioIds"
                :model-parameter="dateModelParam"
                @update-scenario-selection="onUpdateScenarioSelection"
              />
            </div>
            <parallel-coordinates-chart
              class="pc-chart"
              :dimensions-data="runParameterValues"
              :selected-dimensions="dimensions"
              :ordinal-dimensions="ordinalDimensionNames"
              :initial-data-selection="selectedScenarioIds"
              :new-runs-mode="newRunsMode"
              @select-scenario="updateScenarioSelection"
              @generated-scenarios="updateGeneratedScenarios"
              @geo-selection="openGeoSelectionModal"
            />
            <message-display
              style="margin-bottom: 10px;"
              v-if="isPublishing && !hasDefaultRun"
              :message="runningDefaultRun ? 'The default run is currently being executed' : 'You must execute a default run by clicking the button below'"
              :message-type="'warning'"
            />
            <button
              v-if="isPublishing && !hasDefaultRun && !runningDefaultRun"
              class="btn toggle-new-runs-button btn-primary btn-call-for-action"
              @click="createRunWithDefaults()"
            >
              {{ defaultRunButtonCaption }}
            </button>
            <button
              v-if="!isPublishing || hasDefaultRun"
              class="btn toggle-new-runs-button"
              :class="{
                'btn-primary btn-call-for-action': !newRunsMode,
                'btn-default': newRunsMode
              }"
              @click="toggleNewRunsMode()"
            >
              {{ newRunsMode ? 'Cancel' : 'Request new runs' }}
            </button>
            <button
              v-if="newRunsMode"
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
          <div class="column center-column">
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
              <div style="display: flex">
                <div
                  v-if="currentTabView === 'data' && (visibleTimeseriesData.length > 1 || relativeTo !== null)"
                  class="relative-box"
                >
                  <div class="checkbox" v-if="relativeTo">
                    <label
                      @click="showPercentChange = !showPercentChange"
                      style="cursor: pointer; color: black;">
                      <i
                        class="fa fa-lg fa-fw"
                        :class="{ 'fa-check-square-o': showPercentChange, 'fa-square-o': !showPercentChange }"
                      />
                      Use % Change
                    </label>
                  </div>
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
                        @click="setRelativeTo(null); isRelativeDropdownOpen = false;"
                      >
                        none
                      </div>
                      <div
                        v-for="(timeseries, index) in visibleTimeseriesData"
                        class="dropdown-option"
                        :style="{ color: timeseries.color }"
                        :key="index"
                        @click="setRelativeTo(timeseries.id); isRelativeDropdownOpen = false;"
                      >
                        {{timeseries.name}}
                      </div>
                    </template>
                  </dropdown-control>
                </div>
                <button
                  class="btn btn-default toggle-viz-button"
                  :class="{ 'toggle-viz-button-pressed': activeVizOptionsTab !== null }"
                  title="Toggle visualization options"
                  :onClick="() => activeVizOptionsTab = (activeVizOptionsTab === null ? 'vizoptions' : null)"
                >
                  <i class="fa fa-gear"></i>
                </button>
              </div>
            </div>

            <!-- Description tab content -->
            <slot name="datacube-description" v-if="currentTabView === 'description'" />

            <!-- Pre-rendered viz tab content -->
            <!--
              outputSpecs.length > 0 means we have one or more selected run
              FIXME: this should be done directly against allModelRunData
            -->
            <div
              v-if="currentTabView === 'pre-rendered-viz' && outputSpecs.length > 0"
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
                <div v-for="(spec, indx) in outputSpecs" :key="spec.id" :set="pregenDataForSpec = getSelectedPreGenOutput(spec)"
                  class="card-map-container"
                  :style="{ borderColor: colorFromIndex(indx) }"
                  style="border-width: 2px; border-style: solid;"
                  :class="[`card-count-${outputSpecs.length < 5 ? outputSpecs.length : 'n'}`]"
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
              v-if="currentTabView === 'data' && mainModelOutput && isModelMetadata"
              :metadata="metadata"
              :model-run-data="filteredRunData"
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
              <timeseries-chart
                v-if="currentTabView === 'data' && visibleTimeseriesData.length > 0"
                class="timeseries-chart"
                :timeseries-data="timeseriesData"
                :selected-temporal-resolution="selectedTemporalResolution"
                :selected-timestamp="selectedTimestamp"
                :breakdown-option="breakdownOption"
                :unit="(relativeTo && showPercentChange) ? '%' : unit"
                @select-timestamp="setSelectedTimestamp"
              />
              <p
                v-if="
                  currentTabView === 'data' &&
                  breakdownOption !== null &&
                  visibleTimeseriesData.length === 0
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
              <div class="card-maps-box">
                <div v-if="outputSpecs.length > 0 && mapLegendData.length === 2" class="card-maps-legend-container">
                  <span v-if="outputSpecs.length > 1" class="top-padding"></span>
                  <map-legend :ramp="mapLegendData[0]" :label-position="{ top: true, right: false }" />
                </div>
                <div
                  v-if="mapReady && currentTabView === 'data' && regionalData !== null"
                  class="card-maps-container">
                  <div
                    v-for="(spec, indx) in outputSpecs"
                    :key="spec.id"
                    class="card-map-container"
                    :class="[
                      `card-count-${outputSpecs.length < 5 ? outputSpecs.length : 'n'}`
                    ]"
                  >
                    <span
                      v-if="outputSpecs.length > 1"
                      :style="{ color: colorFromIndex(indx)}"
                    >
                      {{ selectedTimeseriesPoints[indx]?.timeseriesName ?? '--' }}
                    </span>
                    <data-analysis-map
                      class="card-map"
                      :style="{ borderColor: colorFromIndex(indx) }"
                      :output-source-specs="outputSpecs"
                      :output-selection=spec.id
                      :relative-to="relativeTo"
                      :is-default-run="spec.isDefaultRun"
                      :show-tooltip="true"
                      :selected-layer-id="mapSelectedLayer"
                      :map-bounds="mapBounds"
                      :region-data="regionalData"
                      :selected-region-ids="selectedRegionIds"
                      :admin-layer-stats="adminLayerStats"
                      :grid-layer-stats="gridLayerStats"
                      :selected-base-layer="selectedBaseLayer"
                      :unit="unit"
                      :selected-color-scheme="finalColorScheme"
                      :show-percent-change="showPercentChange"
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
                <div v-if="outputSpecs.length > 0" class="card-maps-legend-container">
                  <span v-if="outputSpecs.length > 1" class="top-padding"></span>
                  <map-legend :ramp="mapLegendData.length === 2 ? mapLegendData[1] : mapLegendData[0]" />
                </div>
              </div>
            </div>
          </div>
          <div style="position: relative">
            <drilldown-panel
              class="drilldown"
              :active-tab-id="activeDrilldownTab"
              :has-transition="false"
              :hide-close="true"
              :is-open="activeDrilldownTab !== null"
              :tabs="drilldownTabs"
              @close="() => { activeDrilldownTab = null }"
            >
              <template #content>
                <breakdown-pane
                  v-if="activeDrilldownTab ==='breakdown'"
                  :selected-admin-level="selectedAdminLevel"
                  :qualifier-breakdown-data="qualifierBreakdownData"
                  :regional-data="regionalData"
                  :temporal-breakdown-data="temporalBreakdownData"
                  :selected-spatial-aggregation="selectedSpatialAggregation"
                  :selected-temporal-aggregation="selectedTemporalAggregation"
                  :selected-temporal-resolution="selectedTemporalResolution"
                  :selected-timestamp="selectedTimestamp"
                  :selected-scenario-ids="selectedScenarioIds"
                  :selected-region-ids="selectedRegionIds"
                  :selected-qualifier-values="selectedQualifierValues"
                  :selected-breakdown-option="breakdownOption"
                  :selected-timeseries-points="selectedTimeseriesPoints"
                  :selected-years="selectedYears"
                  :unit="unit"
                  @toggle-is-region-selected="toggleIsRegionSelected"
                  @toggle-is-qualifier-selected="toggleIsQualifierSelected"
                  @toggle-is-year-selected="toggleIsYearSelected"
                  @set-selected-admin-level="setSelectedAdminLevel"
                  @set-breakdown-option="setBreakdownOption"
                />
              </template>
            </drilldown-panel>
            <!-- viz options if visible will always be on top of the breakdown panel -->
            <div class="viz-options-modal-mask"
              v-if="activeVizOptionsTab !== null"
              @click="activeVizOptionsTab = null"
            >
              <!-- Catch click events and stop propagation to avoid closing
              the modal every time an interaction occurs within it -->
              <div class="viz-options-modal" @click.stop="">
                <h4>Configuration</h4>
                <viz-options-pane
                  :metadata="metadata"
                  :aggregation-options="aggregationOptions"
                  :selected-aggregation="selectedSpatialAggregation"
                  :selected-unit="unit"
                  :selected-resolution="selectedTemporalResolution"
                  :selected-base-layer="selectedBaseLayer"
                  :selected-base-layer-transparency="selectedBaseLayerTransparency"
                  :selected-data-layer="selectedDataLayer"
                  :color-scheme-reversed="colorSchemeReversed"
                  :selected-color-scheme-name="selectedColorSchemeName"
                  :selected-color-scale-type="selectedColorScaleType"
                  :number-of-color-bins="numberOfColorBins"
                  :selected-color-scheme="finalColorScheme"
                  @set-aggregation-selection="setAggregationSelection"
                  @set-resolution-selection="setTemporalResolutionSelection"
                  @set-base-layer-selection="setBaseLayer"
                  @set-base-layer-transparency-selection="setBaseLayerTransparency"
                  @set-data-layer-selection="setDataLayer"
                  @set-color-scheme-reversed="setColorSchemeReversed"
                  @set-color-scheme-name="setColorSchemeName"
                  @set-color-scale-type="setColorScaleType"
                  @set-number-color-bins="setNumberOfColorBins"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <modal-confirmation
      v-if="showDelete"
      :autofocus-confirm="false"
      @confirm="deleteRun"
      @close="hideDeleteModal"
    >
      <template #title> DELETE MODEL RUN </template>
      <template #message>
        <p>Are you sure you want to delete this model run?</p>
      </template>
    </modal-confirmation>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import { computed, defineComponent, nextTick, PropType, ref, Ref, toRefs, watch, watchEffect } from 'vue';
import { useStore } from 'vuex';
import router from '@/router';

import flatpickr from 'flatpickr';

import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import VizOptionsPane from '@/components/drilldown-panel/viz-options-pane.vue';
import DataAnalysisMap from '@/components/data/analysis-map-simple.vue';
import DatacubeScenarioHeader from '@/components/data/datacube-scenario-header.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import MapLegend from '@/components/widgets/map-legend.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import Modal from '@/components/modals/modal.vue';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';
import ModalGeoSelection from '@/components/modals/modal-geo-selection.vue';
import ModalNewScenarioRuns from '@/components/modals/modal-new-scenario-runs.vue';
import ModalCheckRunsExecutionStatus from '@/components/modals/modal-check-runs-execution-status.vue';
import ModelRunsSearchBar from '@/components/data/model-runs-search-bar.vue';
import ParallelCoordinatesChart from '@/components/widgets/charts/parallel-coordinates.vue';
import RadioButtonGroup from '@/components/widgets/radio-button-group.vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import SmallTextButton from '@/components/widgets/small-text-button.vue';
import TemporalFacet from '@/components/facets/temporal-facet.vue';
import timeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';

import useAnalysisMapStats from '@/services/composables/useAnalysisMapStats';
import useDatacubeHierarchy from '@/services/composables/useDatacubeHierarchy';
import useOutputSpecs from '@/services/composables/useOutputSpecs';
import useParallelCoordinatesData from '@/services/composables/useParallelCoordinatesData';
import useDatacubeDimensions from '@/services/composables/useDatacubeDimensions';
import useQualifiers from '@/services/composables/useQualifiers';
import useRegionalData from '@/services/composables/useRegionalData';
import useScenarioData from '@/services/composables/useScenarioData';
import useSelectedTimeseriesPoints from '@/services/composables/useSelectedTimeseriesPoints';
import useTimeseriesData from '@/services/composables/useTimeseriesData';

import { getInsightById } from '@/services/insight-service';

import { GeoRegionDetail, ScenarioData } from '@/types/Common';
import {
  AggregationOption,
  DatacubeType,
  ModelRunStatus,
  SpatialAggregationLevel,
  TemporalAggregationLevel,
  TemporalResolutionOption,
  GeoAttributeFormat,
  DatacubeGenericAttributeVariableType
} from '@/types/Enums';
import { DatacubeFeature, Indicator, Model, ModelParameter } from '@/types/Datacube';
import { DataState, Insight, ViewState } from '@/types/Insight';
import { ModelRun, PreGeneratedModelRunData, RunsTag } from '@/types/ModelRun';
import { OutputSpecWithId } from '@/types/Runoutput';

import { colorFromIndex, ColorScaleType, COLOR_SCHEMES, COLOR_SWATCH_SIZE } from '@/utils/colors-util';
import { isIndicator, isModel, TAGS, DEFAULT_DATE_RANGE_DELIMETER } from '@/utils/datacube-util';
import { initDataStateFromRefs, initViewStateFromRefs } from '@/utils/drilldown-util';
import { BASE_LAYER, BASE_LAYER_TRANSPARENCY, DATA_LAYER } from '@/utils/map-util-new';

import { createModelRun, updateModelRun, addModelRunsTag, removeModelRunsTag } from '@/services/new-datacube-service';
import { disableConcurrentTileRequestsCaching, enableConcurrentTileRequestsCaching } from '@/utils/map-util';
import API from '@/api/api';
import useToaster from '@/services/composables/useToaster';
import * as d3 from 'd3';

const defaultRunButtonCaption = 'Run with default parameters';

const DRILLDOWN_TABS = [
  {
    name: 'Breakdown',
    id: 'breakdown',
    // TODO: our version of FA doesn't include fa-chart
    icon: 'fa-question'
  }
];

export default defineComponent({
  name: 'DatacubeCard',
  emits: [
    'on-map-load',
    'update-model-parameter'
  ],
  props: {
    isPublishing: {
      type: Boolean,
      default: false
    },
    initialDataConfig: {
      type: Object as PropType<DataState>,
      default: null
    },
    initialViewConfig: {
      type: Object as PropType<ViewState>,
      default: null
    },
    tabState: {
      type: String,
      default: 'description'
    },
    metadata: {
      type: Object as PropType<Model | Indicator | null>,
      default: null
    },
    aggregationOptions: {
      type: Array as PropType<AggregationOption[]>,
      default: []
    },
    temporalResolutionOptions: {
      type: Array as PropType<AggregationOption[]>,
      default: []
    }
  },
  components: {
    BreakdownPane,
    VizOptionsPane,
    DataAnalysisMap,
    DatacubeScenarioHeader,
    DrilldownPanel,
    DropdownControl,
    MapLegend,
    MessageDisplay,
    Modal,
    ModalCheckRunsExecutionStatus,
    ModalConfirmation,
    ModalGeoSelection,
    ModalNewScenarioRuns,
    ModelRunsSearchBar,
    ParallelCoordinatesChart,
    RadioButtonGroup,
    RenameModal,
    SmallTextButton,
    TemporalFacet,
    timeseriesChart
  },
  setup(props, { emit }) {
    const timeInterval = 10000;
    const store = useStore();

    const {
      isPublishing,
      initialDataConfig,
      initialViewConfig,
      metadata,
      tabState
    } = toRefs(props);

    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const projectType = computed(() => store.getters['app/projectType']);
    const tour = computed(() => store.getters['tour/tour']);
    const toaster = useToaster();

    const activeDrilldownTab = ref<string|null>('breakdown');
    const activeVizOptionsTab = ref<string|null>(null);
    const currentTabView = ref<string>('description');
    const potentialScenarioCount = ref<number|null>(0);
    const potentialScenarios = ref<ScenarioData[]>([]);
    const showDatasets = ref<boolean>(false);
    const newRunsMode = ref<boolean>(false);
    const isRelativeDropdownOpen = ref<boolean>(false);
    const showGeoSelectionModal = ref<boolean>(false);
    const geoModelParam = ref<ModelParameter | null>(null);
    const showNewRunsModal = ref<boolean>(false);
    const showModelRunsExecutionStatus = ref<boolean>(false);
    const showPercentChange = ref<boolean>(true);
    const mapReady = ref<boolean>(false);
    const selectedTimestamp = ref(null) as Ref<number | null>;
    const breakdownOption = ref<string | null>(null);
    const selectedAdminLevel = ref(0);
    const selectedBaseLayer = ref(BASE_LAYER.DEFAULT);
    const selectedBaseLayerTransparency = ref(BASE_LAYER_TRANSPARENCY['50%']);
    const selectedDataLayer = ref(DATA_LAYER.ADMIN);
    const selectedScenarioIds = ref([] as string[]);
    const selectedScenarios = ref([] as ModelRun[]);
    const selectedSpatialAggregation = ref<AggregationOption>(AggregationOption.Mean);
    const selectedTemporalAggregation = ref<AggregationOption>(AggregationOption.Mean);
    const selectedTemporalResolution = ref<TemporalResolutionOption>(TemporalResolutionOption.Month);

    //
    // color scheme options
    //
    const colorSchemeReversed = ref(false);
    const selectedColorSchemeName = ref(Object.keys(COLOR_SCHEMES)[0]); // DEFAULT
    const selectedColorScaleType = ref(ColorScaleType.Discrete);
    const numberOfColorBins = ref(5); // assume default number of 5 bins on startup

    const showTagNameModal = ref<boolean>(false);
    const showScenarioTagsModal = ref<boolean>(false);

    const datePickerElement = ref<HTMLElement | null>(null);
    const dateParamPickerValue = ref<any | null>(null);

    const searchFilters = ref<any>({});

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);
    const modelRunsFetchedAt = ref(0);

    const runFromInsight = ref<boolean>(false); // do we have a run from loaded insight?

    // we are receiving metadata from above (i.e. consumers) and we should not be setting a new model-id here at this level
    const selectedModelId = computed(() => metadata.value?.id ?? null);

    const currentOutputIndex = computed(() => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);
    const isModelMetadata = computed(() => metadata.value !== null && isModel(metadata.value));
    const isIndicatorDatacube = computed(() => metadata.value !== null && isIndicator(metadata.value));

    const {
      dimensions,
      ordinalDimensionNames
    } = useDatacubeDimensions(metadata);

    // FIXME: we only support one date param of each model datacube
    const dateModelParam = computed(() => {
      const modelMetadata = metadata.value;
      if (modelMetadata === null || !isModel(modelMetadata)) return null;
      const dateParams = modelMetadata.parameters.filter(dim => dim.type === DatacubeGenericAttributeVariableType.DateRange);
      return dateParams.length > 0 ? dateParams[0] : null;
    });

    const { allModelRunData, filteredRunData } = useScenarioData(selectedModelId, modelRunsFetchedAt, searchFilters, dimensions);

    const updateAndFetch = async (newDefaultRun: ModelRun) => {
      const defaultRunModified = { ...newDefaultRun, is_default_run: true };
      await updateModelRun(defaultRunModified);
      fetchData();
    };

    watchEffect(() => {
      // If there are no default runs then set a run to default if it matches the default parameters
      if (isPublishing.value && allModelRunData.value.every(run => !run.is_default_run) && metadata.value && isModel(metadata.value)) {
        const parameterDictionary = _.mapValues(_.keyBy(metadata.value.parameters, 'name'), 'default');
        const newDefaultRun = allModelRunData.value.find(run => {
          const runParameterDictionary = _.mapValues(_.keyBy(run.parameters, 'name'), 'value');
          return Object.keys(parameterDictionary).every(p => runParameterDictionary[p] === parameterDictionary[p]);
        });
        if (newDefaultRun) {
          updateAndFetch(newDefaultRun);
        }
      }
    });
    const hasDefaultRun = computed(() => allModelRunData.value.some(run => run.is_default_run && run.status === ModelRunStatus.Ready));
    const canClickDataTab = computed(() => {
      return runFromInsight.value || !isPublishing.value || hasDefaultRun.value || (metadata.value && isIndicator(metadata.value));
    });
    const {
      runParameterValues
    } = useParallelCoordinatesData(metadata, filteredRunData);

    const scenarioCount = computed(() => runParameterValues.value.length);

    const runningDefaultRun = computed(() => allModelRunData.value.some(run => run.is_default_run && (run.status === ModelRunStatus.Processing || run.status === ModelRunStatus.Submitted)));

    // apply initial data config for this datacube
    const initialSelectedRegionIds = ref<string[]>([]);
    const initialSelectedQualifierValues = ref<string[]>([]);
    const initialSelectedYears = ref<string[]>([]);

    const addNewTag = (tagName: string) => {
      let numAdded = 0;
      selectedScenarios.value.forEach(s => {
        if (!s.tags.includes(tagName)) {
          numAdded++;
          s.tags.push(tagName);
        }
      });
      showTagNameModal.value = false;
      if (numAdded > 0) {
        toaster(`Successfully added '${tagName}' to ${numAdded} run${numAdded === 1 ? '' : 's'}`, 'success', false);
      } else {
        toaster(`Selected run${selectedScenarios.value.length === 1 ? ' is' : 's are'} already tagged with '${tagName}'`, 'success', false);
      }
      addModelRunsTag(selectedScenarios.value.map(run => run.id), tagName);
    };

    const runTags = ref<RunsTag[]>([]);

    watchEffect(() => {
      if (filteredRunData.value && filteredRunData.value.length > 0) {
        const tags: RunsTag[] = [];
        filteredRunData.value.forEach(run => {
          run.tags.forEach(tag => {
            const existingTagIndx = tags.findIndex(t => t.label === tag);
            if (existingTagIndx >= 0) {
              tags[existingTagIndx].count++;
            } else {
              tags.push({
                label: tag,
                count: 1,
                selected: false
              });
            }
          });
        });
        runTags.value = tags;
      }
    });

    const setDatacubeCurrentOutputsMap = (updatedMap: any) => store.dispatch('app/setDatacubeCurrentOutputsMap', updatedMap);

    const setBaseLayer = (val: BASE_LAYER) => {
      selectedBaseLayer.value = val;
    };

    const setBaseLayerTransparency = (val: BASE_LAYER_TRANSPARENCY) => {
      selectedBaseLayerTransparency.value = val;
    };

    const setDataLayer = (val: DATA_LAYER) => {
      selectedDataLayer.value = val;
    };

    const setAggregationSelection = (aggOption: AggregationOption) => {
      selectedTemporalAggregation.value = aggOption;
      selectedSpatialAggregation.value = aggOption;
    };

    const setTemporalResolutionSelection = (temporalRes: TemporalResolutionOption) => {
      selectedTemporalResolution.value = temporalRes;
    };

    const setSelectedAdminLevel = (level: number) => {
      selectedAdminLevel.value = level;
    };

    const setBreakdownOption = (newValue: string | null) => {
      breakdownOption.value = newValue;
    };

    const setColorSchemeReversed = (reversed: boolean) => {
      colorSchemeReversed.value = reversed;
    };

    const setColorSchemeName = (schemeName: string) => {
      selectedColorSchemeName.value = schemeName;
    };

    const setColorScaleType = (scaleType: ColorScaleType) => {
      selectedColorScaleType.value = scaleType;
    };

    const setNumberOfColorBins = (numBins: number) => {
      numberOfColorBins.value = numBins;
    };

    // note that final color scheme represents the list of final colors that should be used, for example, in the map and its legend
    // however, the map/legend may ignore the generated final color list and instead use the color-related viz options to generate a slightly different color array that can be used when rendering the map/legend
    const finalColorScheme = computed(() => {
      // Note: should/can not reverse the original array. Instead, clone and reverse
      const rawScheme = _.clone((COLOR_SCHEMES as any)[selectedColorSchemeName.value]);
      const scheme: string[] = colorSchemeReversed.value ? rawScheme.reverse() : rawScheme;
      const n = scheme.length * COLOR_SWATCH_SIZE;

      const getColorScale = () => {
        if (selectedColorScaleType.value === ColorScaleType.Log) {
          return d3.scaleLog<string>()
            .domain([1 / n, 1])
            .range([scheme[0], scheme[scheme.length - 1]]);
        }
        // NOTE: The following 3 ways are the same when creating the color scale
        // return d3.scaleSequential([scheme[0], scheme[scheme.length - 1]]);
        // return d3.interpolateRgb(scheme[0], scheme[scheme.length - 1]);
        return d3.scaleLinear<string>().range([scheme[0], scheme[scheme.length - 1]]);
      };

      const colorScale = getColorScale();

      // limit the availabe scheme colors to the user selected number of bins, if needed
      const numColors = selectedColorScaleType.value === ColorScaleType.Discrete ? numberOfColorBins.value : n;

      // re-create the color scheme with the final list of colors
      scheme.length = 0;
      for (let i = 0; i < numColors; ++i) {
        const color: string = colorScale ? colorScale(i / (numColors - 1)) : 'black';
        scheme.push(d3.color(color)?.formatHex() ?? '');
      }

      return scheme;
    });

    const updateTabView = (val: string) => {
      currentTabView.value = val;
    };
    const onMapLoad = () => {
      emit('on-map-load');
    };

    // apply initial view config for this datacube
    watchEffect(() => {
      if (initialViewConfig.value && !_.isEmpty(initialViewConfig.value)) {
        if (initialViewConfig.value.spatialAggregation !== undefined) {
          selectedSpatialAggregation.value = initialViewConfig.value.spatialAggregation as AggregationOption;
        }
        if (initialViewConfig.value.temporalResolution !== undefined) {
          selectedTemporalResolution.value = initialViewConfig.value.temporalResolution as TemporalResolutionOption;
        }
        if (initialViewConfig.value.temporalAggregation !== undefined) {
          selectedTemporalAggregation.value = initialViewConfig.value.temporalAggregation as AggregationOption;
        }
        if (initialViewConfig.value.selectedMapBaseLayer !== undefined) {
          selectedBaseLayer.value = initialViewConfig.value.selectedMapBaseLayer;
        }
        if (initialViewConfig.value.selectedMapDataLayer !== undefined) {
          selectedDataLayer.value = initialViewConfig.value.selectedMapDataLayer;
        }
        if (initialViewConfig.value.breakdownOption !== undefined) {
          breakdownOption.value = initialViewConfig.value.breakdownOption;
        }
        if (initialViewConfig.value.selectedAdminLevel !== undefined) {
          selectedAdminLevel.value = initialViewConfig.value.selectedAdminLevel;
        }
        if (initialViewConfig.value.baseLayerTransparency !== undefined) {
          selectedBaseLayerTransparency.value = initialViewConfig.value.baseLayerTransparency;
        }
        if (initialViewConfig.value.colorSchemeReversed !== undefined) {
          colorSchemeReversed.value = initialViewConfig.value.colorSchemeReversed;
        }
        if (initialViewConfig.value.colorSchemeName !== undefined) {
          selectedColorSchemeName.value = initialViewConfig.value.colorSchemeName;
        }
        if (initialViewConfig.value.colorScaleType !== undefined) {
          selectedColorScaleType.value = initialViewConfig.value.colorScaleType;
        }
        if (initialViewConfig.value.numberOfColorBins !== undefined) {
          numberOfColorBins.value = initialViewConfig.value.numberOfColorBins;
        }
        // FIXME: although we have restored the color palette/scale/options,
        //  none of those will look applied since the final color list is only generated when the viz-option is opened
      }
    });

    // HACK: please delete this
    const clearRouteParam = () => {
      if (!selectedModelId.value) {
        return; // yo dawg, I heard you like hacks so I put a hack in your hack
      }

      // fix to avoid double history later
      router.push({
        query: {
          insight_id: undefined,
          datacube_id: selectedModelId.value
        }
      }).catch(() => {});
    };

    const setSelectedScenarioIds = (newIds: string[]) => {
      if (_.isEqual(selectedScenarioIds.value, newIds)) return;

      selectedScenarioIds.value = newIds;

      clearRouteParam();

      if (newIds.length > 0) {
        // selecting a run or multiple runs when the desc tab is active should always open the data tab
        //  selecting a run or multiple runs otherwise should respect the current tab
        if (currentTabView.value === 'description') {
          if (canClickDataTab.value) {
            updateTabView('data');
          }
        }
        // once the list of selected scenario changes,
        // extract model runs that match the selected scenario IDs
        selectedScenarios.value = newIds.reduce((filteredRuns: ModelRun[], runId) => {
          filteredRunData.value.some(run => {
            return runId === run.id && filteredRuns.push(run);
          });
          return filteredRuns;
        }, []);
      } else {
        selectedScenarios.value = [];
        updateTabView('description');
      }
    };

    const modelRunsSearchData = ref<{[key: string]: any}>({});
    watchEffect(() => {
      const result: {[key: string]: any} = {};
      // add a search item for searching by tags
      result[TAGS] = {
        display_name: 'Tag',
        values: []
      };
      // add a search item for each (input/output) dimesion
      dimensions.value.forEach(dim => {
        result[dim.name] = {
          display_name: dim.display_name,
          type: dim.type
        };
        if (dim.choices && dim.choices.length > 0) {
          result[dim.name].values = _.uniq(Array.from(dim.choices));
        }
      });
      modelRunsSearchData.value = result;
    });

    watchEffect(() => {
      if (runTags.value) {
        modelRunsSearchData.value[TAGS].values = runTags.value.map(tagInfo => tagInfo.label);
      }
    });

    const onModelRunsFiltersUpdated = (filters: any) => {
      searchFilters.value = filters; // this should kick the watcher to update the content of the data-state object
    };

    watch(
      () => initialDataConfig.value,
      () => {
        if (initialDataConfig.value && !_.isEmpty(initialDataConfig.value)) {
          if (initialDataConfig.value.selectedScenarioIds !== undefined) {
            runFromInsight.value = true;
            setSelectedScenarioIds(_.clone(initialDataConfig.value.selectedScenarioIds));
          }
          if (initialDataConfig.value.selectedRegionIds !== undefined) {
            initialSelectedRegionIds.value = _.clone(initialDataConfig.value.selectedRegionIds);
          }
          if (initialDataConfig.value.selectedQualifierValues !== undefined) {
            initialSelectedQualifierValues.value = _.clone(initialDataConfig.value.selectedQualifierValues);
          }
          // do we have a search filter that was saved before!?
          if (initialDataConfig.value.searchFilters !== undefined) {
            // restoring a state where some searchFilters were defined
            if (!_.isEmpty(initialDataConfig.value.searchFilters) && initialDataConfig.value.searchFilters.clauses.length > 0) {
              searchFilters.value = _.clone(initialDataConfig.value.searchFilters);
            }
          } else {
            // we may be applying an insight that was captured before introducing the searchFilters capability
            //  so we need to clear any existing filters that may affect the available model runs
            searchFilters.value = {};
          }
        }
      },
      { immediate: true }
    );

    const clickData = (tab: string) => {
      if (tab !== 'data' || canClickDataTab.value) {
        // FIXME: This code to select a model run when switching to the data tab
        // should be in a watcher on the parent component to be more robust,
        // rather than in this button's click handler.

        if (isModelMetadata.value && selectedScenarioIds.value.length === 0) {
          // clicking on either the 'data' or 'pre-rendered-viz' tabs when no runs is selected should always pick the baseline run
          const readyRuns = filteredRunData.value.filter(r => r.status === ModelRunStatus.Ready && r.is_default_run);
          if (readyRuns.length === 0) {
            console.warn('cannot find a baseline model run indicated by the is_default_run');
            // failed to find baseline using the 'is_default_run' flag
            // FIXME: so, try to find a model run that has values matching the default values of all inputs
          }
          const newIds = readyRuns.map(run => run.id).slice(0, 1);
          setSelectedScenarioIds(newIds);
        }

        updateTabView(tab);
        //
        // advance the relevant tour if it is active
        //
        if (tab === 'data' && tour.value && tour.value.id.startsWith('aggregations-tour')) {
          tour.value.next();
        }
      } else {
        toaster(`At least one run must match the default parameters. Click "${defaultRunButtonCaption}"`, 'error', true);
      }
    };

    const onTabClick = (value: string) => {
      if (value === 'description' && isModelMetadata.value) {
        setSelectedScenarioIds([]); // this will update the 'currentTabView'
      }
      clickData(value);
    };

    const requestNewModelRuns = () => {
      showNewRunsModal.value = true;
    };

    const showModelExecutionStatus = () => {
      showModelRunsExecutionStatus.value = true;
    };

    const toggleNewRunsMode = () => {
      newRunsMode.value = !newRunsMode.value;
      potentialScenarioCount.value = 0;
      potentialScenarios.value.length = 0;

      if (newRunsMode.value) {
        // clear any selected scenario and show the model desc page
        updateScenarioSelection({ scenarios: [] });
      }
    };

    watch(
      () => [dateParamPickerValue.value],
      () => {
        updatePotentialScenarioDates();
      }
    );

    watchEffect(() => {
      // if date/geo param exist and the metadata has been updated, then we may need to re-create the date picker if we are in the new runs mode
      if (metadata.value !== null && newRunsMode.value && dateModelParam.value !== null) {
        nextTick(() => {
          if (dateModelParam.value !== null) {
            // clear existing scenarios, if any since the date/goe param formatting may have changed
            potentialScenarioCount.value = 0;
            potentialScenarios.value.length = 0;

            const datePickerOptions: flatpickr.Options.Options = {
              // defaultDate: initial date for the date picker
              // altInput: true, // display date in a more readable, customizable, format
              // mode: "multiple" is it possible to select multiple individual date(s)
              mode: dateModelParam.value.type === DatacubeGenericAttributeVariableType.DateRange ? 'range' : 'single', // enable date range selection
              allowInput: false, // should the user be able to directly enter date value?
              wrap: true, // enable the flatpickr lib to utilize toggle/clear buttons
              clickOpens: false // do not allow click on the input date picker to open the calendar
            };
            // minimum allowed date
            if (dateModelParam.value.additional_options?.date_min) {
              datePickerOptions.minDate = dateModelParam.value.additional_options.date_min;
            }
            // maximum allowed date
            if (dateModelParam.value.additional_options?.date_max) {
              datePickerOptions.maxDate = dateModelParam.value.additional_options.date_max;
            }
            if (datePickerElement.value !== null) {
              flatpickr(datePickerElement.value, datePickerOptions);
            }
          }
        });
      }
    });

    function fetchData() {
      if (!newRunsMode.value && metadata.value?.type === DatacubeType.Model) {
        modelRunsFetchedAt.value = Date.now();
      }
    }

    // @REVIEW: consider notifying the user of new data and only fetch/reload if confirmed
    const timerHandler = setInterval(fetchData, timeInterval);

    const onNewScenarioRunsModalClose = (status: any) => {
      showNewRunsModal.value = false;
      if (status.cancel === false) {
        // execution has just started for some new runs so start the hot-reload cycle
        // first, exit new-runs-mode
        toggleNewRunsMode();
        // then, re-fetch data from server (wait some time to give the server a chance to update)
        _.delay(() => fetchData(), 2000);
      }
    };

    const updateScenarioSelection = (e: { scenarios: Array<ScenarioData> }) => {
      const selectedScenarios = e.scenarios.filter(s => s.status === ModelRunStatus.Ready);
      if (selectedScenarios.length === 0) {
        setSelectedScenarioIds([]);
      } else {
        const selectedRunIDs = selectedScenarios.map(s => s.run_id.toString());
        setSelectedScenarioIds(selectedRunIDs);
      }
    };

    const onUpdateScenarioSelection = (scenarioIDs: string[]) => {
      setSelectedScenarioIds(scenarioIDs);
    };

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
      if (isIndicatorDatacube.value) {
        headerGroupButtons.value = headerGroupButtonsSimple;
      }
      // models with no pre-generated data should not have the 'Media' tab
      if (filteredRunData.value !== null && filteredRunData.value.length > 0) {
        const runsWithPreGenDataAvailable = _.some(filteredRunData.value, r => r.pre_gen_output_paths && _.some(r.pre_gen_output_paths, p => p.coords === undefined));
        if (!runsWithPreGenDataAvailable) {
          headerGroupButtons.value = headerGroupButtonsSimple;
        }
      }
    });

    watchEffect(() => {
      if (isPublishing.value && tabState.value) {
        onTabClick(tabState.value);
      }
    });

    const preGenDataMap = ref<{[key: string]: PreGeneratedModelRunData[]}>({}); // map all pre-gen data for each run
    const preGenDataItems = ref<string[]>([]);
    const selectedPreGenDataItem = ref('');
    watchEffect(() => {
      if (filteredRunData.value !== null && filteredRunData.value.length > 0) {
        // build a map of all pre-gen data indexed by run-id
        preGenDataMap.value = Object.assign({}, ...filteredRunData.value.map((r) => ({ [r.id]: r.pre_gen_output_paths })));
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

    const dataPaths = computed((): string[] => {
      if (!_.isNull(metadata.value)) {
        const isAModel: boolean = isModel(metadata.value);
        return _.compact(isAModel
          ? filteredRunData.value
            .filter(modelRun => selectedScenarioIds.value.indexOf(modelRun.id) >= 0)
            .flatMap(modelRun => _.head(modelRun.data_paths))
          : isIndicator(metadata.value) ? metadata.value.data_paths : []
        );
      } else {
        return [];
      }
    });


    const unit = computed(() =>
      mainModelOutput?.value?.unit &&
        mainModelOutput.value.unit !== ''
        ? mainModelOutput.value.unit
        : null
    );

    const setSelectedTimestamp = (timestamp: number | null) => {
      if (selectedTimestamp.value === timestamp) return;
      selectedTimestamp.value = timestamp;
    };

    const updateGeneratedScenarios = (e: { scenarios: Array<ScenarioData> }) => {
      potentialScenarioCount.value = e.scenarios.length;
      potentialScenarios.value = e.scenarios;
      updatePotentialScenarioDates();
    };

    const updatePotentialScenarioDates = () => {
      // since any date or datarange params are not automatically considered,
      //  we need to ensure they are added as part of potential scenarios data
      if (dateModelParam.value !== null) {
        // FIXME: handle the case of multiple date and/or daterange params
        const delimiter = dateModelParam.value.additional_options?.date_range_delimiter ?? DEFAULT_DATE_RANGE_DELIMETER;
        let dateValue = '';
        if (dateParamPickerValue.value === null || dateParamPickerValue.value === '') {
          dateValue = dateModelParam.value.default;
        } else {
          dateValue = dateModelParam.value.type === DatacubeGenericAttributeVariableType.Date ? dateParamPickerValue.value : dateParamPickerValue.value.replace(' to ', delimiter);
        }
        potentialScenarios.value.forEach(run => {
          if (dateModelParam.value !== null) {
            run[dateModelParam.value.type] = dateValue;
          }
        });
      }
    };

    const updateStateFromInsight = async (insight_id: string) => {
      const loadedInsight: Insight = await getInsightById(insight_id);
      // FIXME: before applying the insight, which will overwrite current state,
      //  consider pushing current state to the url to support browser hsitory
      //  in case the user wants to navigate to the original state using back button
      if (loadedInsight) {
        //
        // insight was found and loaded
        //
        // data state
        // FIXME: the order of resetting the state is important
        if (loadedInsight.data_state?.selectedModelId) {
          // this will reload datacube metadata as well as scenario runs
          // NOTE: emit an event to the parent to reset the model metadata based on the new ID
          //  Seems to be not needed anymore since applying an insight also involves passing the datacube_id as a query param
          //  but will leave old code here for reference
          // selectedModelId.value = loadedInsight.data_state?.selectedModelId;
        }
        // do we have a search filter that was saved before!?
        if (loadedInsight.data_state?.searchFilters !== undefined) {
          // restoring a state where some searchFilters were defined
          if (!_.isEmpty(loadedInsight.data_state?.searchFilters) && loadedInsight.data_state?.searchFilters.clauses.length > 0) {
            searchFilters.value = _.clone(loadedInsight.data_state?.searchFilters);
          }
        } else {
          // we may be applying an insight that was captured before introducing the searchFilters capability
          //  so we need to clear any existing filters that may affect the available model runs
          searchFilters.value = {};
        }
        if (loadedInsight.data_state?.selectedScenarioIds) {
          // this would only be valid and effective if/after datacube runs are reloaded
          setSelectedScenarioIds(loadedInsight.data_state?.selectedScenarioIds);
        }
        if (loadedInsight.data_state?.selectedTimestamp !== undefined) {
          setSelectedTimestamp(loadedInsight.data_state?.selectedTimestamp);
        }
        if (loadedInsight.data_state?.relativeTo !== undefined) {
          setRelativeTo(loadedInsight.data_state?.relativeTo);
        }
        // view state
        if (loadedInsight.view_state?.spatialAggregation) {
          selectedSpatialAggregation.value = loadedInsight.view_state?.spatialAggregation as AggregationOption;
        }
        if (loadedInsight.view_state?.temporalAggregation) {
          selectedTemporalAggregation.value = loadedInsight.view_state?.temporalAggregation as AggregationOption;
        }
        if (loadedInsight.view_state?.temporalResolution) {
          selectedTemporalResolution.value = loadedInsight.view_state?.temporalResolution as TemporalResolutionOption;
        }
        if (loadedInsight.view_state?.isDescriptionView !== undefined) {
          // FIXME
          updateTabView(loadedInsight.view_state?.isDescriptionView ? 'description' : 'data');
        }
        if (loadedInsight.view_state?.selectedOutputIndex !== undefined) {
          const updatedCurrentOutputsMap = _.cloneDeep(datacubeCurrentOutputsMap);
          const datacubeId = metadata?.value ? metadata.value.id : loadedInsight.data_state?.selectedModelId;
          updatedCurrentOutputsMap.value[datacubeId ?? ''] = loadedInsight.view_state?.selectedOutputIndex;
          setDatacubeCurrentOutputsMap(updatedCurrentOutputsMap);
        }
        if (loadedInsight.view_state?.selectedMapBaseLayer) {
          setBaseLayer(loadedInsight.view_state?.selectedMapBaseLayer);
        }
        if (loadedInsight.view_state?.selectedMapDataLayer) {
          setDataLayer(loadedInsight.view_state?.selectedMapDataLayer);
        }
        if (loadedInsight.view_state?.breakdownOption !== undefined) {
          setBreakdownOption(loadedInsight.view_state?.breakdownOption);
        }
        if (loadedInsight.view_state?.selectedAdminLevel !== undefined) {
          setSelectedAdminLevel(loadedInsight.view_state?.selectedAdminLevel);
        }
        if (loadedInsight.view_state?.baseLayerTransparency !== undefined) {
          setBaseLayerTransparency(loadedInsight.view_state?.baseLayerTransparency);
        }
        if (loadedInsight.view_state?.colorSchemeReversed !== undefined) {
          setColorSchemeReversed(loadedInsight.view_state?.colorSchemeReversed);
        }
        if (loadedInsight.view_state?.colorSchemeName !== undefined) {
          setColorSchemeName(loadedInsight.view_state?.colorSchemeName);
        }
        if (loadedInsight.view_state?.colorScaleType !== undefined) {
          setColorScaleType(loadedInsight.view_state?.colorScaleType);
        }
        if (loadedInsight.view_state?.numberOfColorBins !== undefined) {
          setNumberOfColorBins(loadedInsight.view_state?.numberOfColorBins);
        }
        // @NOTE: 'initialSelectedRegionIds' must be set after 'selectedAdminLevel'
        if (loadedInsight.data_state?.selectedRegionIds !== undefined) {
          initialSelectedRegionIds.value = _.clone(loadedInsight.data_state?.selectedRegionIds);
        }
        // @NOTE: 'initialSelectedQualifierValues' must be set after 'breakdownOption'
        if (loadedInsight.data_state?.selectedQualifierValues !== undefined) {
          initialSelectedQualifierValues.value = _.clone(loadedInsight.data_state?.selectedQualifierValues);
        }
        // @NOTE: 'initialSelectedYears' must be set after 'breakdownOption'
        if (loadedInsight.data_state?.selectedYears !== undefined) {
          initialSelectedYears.value = _.clone(loadedInsight.data_state?.selectedYears);
        }
      }
    };

    const {
      datacubeHierarchy,
      selectedRegionIds,
      toggleIsRegionSelected
    } = useDatacubeHierarchy(
      selectedScenarioIds,
      metadata,
      selectedAdminLevel,
      breakdownOption,
      initialSelectedRegionIds
    );

    const {
      qualifierBreakdownData,
      toggleIsQualifierSelected,
      selectedQualifierValues
    } = useQualifiers(
      metadata,
      breakdownOption,
      selectedScenarioIds,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      selectedTimestamp,
      initialSelectedQualifierValues
    );

    const {
      timeseriesData,
      visibleTimeseriesData,
      relativeTo,
      baselineMetadata,
      setRelativeTo,
      temporalBreakdownData,
      selectedYears,
      toggleIsYearSelected
    } = useTimeseriesData(
      metadata,
      selectedScenarioIds,
      selectedTemporalResolution,
      selectedTemporalAggregation,
      selectedSpatialAggregation,
      breakdownOption,
      selectedTimestamp,
      setSelectedTimestamp,
      selectedRegionIds,
      selectedQualifierValues,
      initialSelectedYears,
      showPercentChange,
      selectedScenarios
    );

    const { selectedTimeseriesPoints } = useSelectedTimeseriesPoints(
      breakdownOption,
      timeseriesData,
      selectedTimestamp,
      selectedScenarioIds
    );


    const {
      outputSpecs
    } = useOutputSpecs(
      selectedModelId,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      metadata,
      selectedTimeseriesPoints,
      filteredRunData
    );

    const {
      regionalData
    } = useRegionalData(
      outputSpecs,
      breakdownOption,
      datacubeHierarchy,
      relativeTo
    );

    const {
      onSyncMapBounds,
      mapBounds,
      updateMapCurSyncedZoom,
      recalculateGridMapDiffStats,
      adminLayerStats,
      gridLayerStats,
      mapLegendData,
      mapSelectedLayer
    } = useAnalysisMapStats(outputSpecs, regionalData, relativeTo, selectedDataLayer, selectedAdminLevel, showPercentChange, finalColorScheme);

    watchEffect(() => {
      if (metadata.value && currentOutputIndex.value >= 0) {
        const outputs = metadata.value?.validatedOutputs ? metadata.value?.validatedOutputs : metadata.value?.outputs;
        mainModelOutput.value = outputs[currentOutputIndex.value];
      }

      if (isIndicatorDatacube.value) {
        selectedScenarioIds.value = [DatacubeType.Indicator.toString()];
      }
    });

    watchEffect(() => {
      // If more than one run is selected, make sure "split by" is set to none.
      if (selectedScenarioIds.value.length > 1) {
        breakdownOption.value = null;
      }
    });

    watchEffect(() => {
      const viewState: ViewState = initViewStateFromRefs(
        breakdownOption,
        currentOutputIndex,
        currentTabView,
        selectedAdminLevel,
        selectedBaseLayer,
        selectedDataLayer,
        selectedSpatialAggregation,
        selectedTemporalAggregation,
        selectedTemporalResolution,
        selectedBaseLayerTransparency,
        colorSchemeReversed,
        selectedColorSchemeName,
        selectedColorScaleType,
        numberOfColorBins
      );
      store.dispatch('insightPanel/setViewState', viewState);

      const dataState: DataState = initDataStateFromRefs(
        mainModelOutput,
        metadata,
        relativeTo,
        selectedModelId,
        selectedQualifierValues,
        selectedRegionIds,
        selectedScenarioIds,
        selectedTimestamp,
        selectedYears,
        searchFilters,
        visibleTimeseriesData
      );

      store.dispatch('insightPanel/setDataState', dataState);
    });

    return {
      addNewTag,
      allModelRunData,
      activeDrilldownTab,
      activeVizOptionsTab,
      adminLayerStats,
      baselineMetadata,
      breakdownOption,
      canClickDataTab,
      colorFromIndex,
      currentTabView,
      dateModelParam,
      datePickerElement,
      dateParamPickerValue,
      dataPaths,
      defaultRunButtonCaption,
      dimensions,
      drilldownTabs: DRILLDOWN_TABS,
      fetchData,
      filteredRunData,
      geoModelParam,
      getSelectedPreGenOutput,
      gridLayerStats,
      hasDefaultRun,
      headerGroupButtons,
      isModelMetadata,
      isRelativeDropdownOpen,
      mainModelOutput,
      mapBounds,
      mapLegendData,
      mapReady,
      mapSelectedLayer,
      modelRunsSearchData,
      newRunsMode,
      onMapLoad,
      onModelRunsFiltersUpdated,
      onNewScenarioRunsModalClose,
      onSyncMapBounds,
      onTabClick,
      onUpdateScenarioSelection,
      ordinalDimensionNames,
      outputSpecs,
      potentialScenarios,
      potentialScenarioCount,
      projectType,
      preGenDataItems,
      qualifierBreakdownData,
      recalculateGridMapDiffStats,
      regionalData,
      relativeTo,
      requestNewModelRuns,
      runningDefaultRun,
      runParameterValues,
      scenarioCount,
      searchFilters,
      selectedAdminLevel,
      selectedBaseLayer,
      selectedBaseLayerTransparency,
      finalColorScheme,
      setColorSchemeReversed,
      colorSchemeReversed,
      setColorSchemeName,
      selectedColorSchemeName,
      setColorScaleType,
      selectedColorScaleType,
      setNumberOfColorBins,
      numberOfColorBins,
      selectedDataLayer,
      selectedPreGenDataItem,
      selectedQualifierValues,
      selectedRegionIds,
      selectedScenarioIds,
      selectedScenarios,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      selectedTimeseriesPoints,
      selectedTimestamp,
      selectedYears,
      setSelectedAdminLevel,
      setBreakdownOption,
      setBaseLayer,
      setBaseLayerTransparency,
      setDataLayer,
      setRelativeTo,
      setSelectedTimestamp,
      setAggregationSelection,
      setTemporalResolutionSelection,
      showDatasets,
      showGeoSelectionModal,
      showModelExecutionStatus,
      showModelRunsExecutionStatus,
      showScenarioTagsModal,
      showNewRunsModal,
      showTagNameModal,
      SpatialAggregationLevel,
      TemporalAggregationLevel,
      temporalBreakdownData,
      timerHandler,
      timeseriesData,
      toaster,
      toggleIsQualifierSelected,
      toggleIsRegionSelected,
      toggleIsYearSelected,
      toggleNewRunsMode,
      unit,
      updatePotentialScenarioDates,
      updateStateFromInsight,
      updateGeneratedScenarios,
      updateMapCurSyncedZoom,
      updateScenarioSelection,
      visibleTimeseriesData,
      showPercentChange
    };
  },
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'data' or 'modelPublishingExperiment' spaces
        if ((this.$route.name === 'data' || this.$route.name === 'modelPublishingExperiment') && this.$route.query) {
          const insight_id = this.$route.query.insight_id as any;
          if (insight_id !== undefined) {
            this.updateStateFromInsight(insight_id);
          }
        }
      },
      immediate: true
    }
  },
  created() {
    enableConcurrentTileRequestsCaching().then(() => (this.mapReady = true));
  },
  unmounted() {
    disableConcurrentTileRequestsCaching();
    clearInterval(this.timerHandler);
  },
  data: () => ({
    idToDelete: '',
    showDelete: false,
    DatacubeGenericAttributeVariableType
  }),
  computed: {
    tagsSharedBySelectedRuns() {
      if (this.selectedScenarios.length === 0) return [];
      let result: string[] = this.selectedScenarios[0].tags;
      this.selectedScenarios.slice(1).forEach(scenario => {
        const tags = scenario.tags;
        result = result.filter(tag => tags.includes(tag));
      });
      return result;
    }
  },
  methods: {
    openGeoSelectionModal(modelParam: ModelParameter) {
      this.showGeoSelectionModal = true;
      this.geoModelParam = modelParam;
    },
    onGeoSelectionModalClose(eventData: any) {
      this.showGeoSelectionModal = false;
      if (!eventData.cancel) {
        const selectedRegions: GeoRegionDetail[] = eventData.selectedRegions;
        if (selectedRegions && selectedRegions.length > 0) {
          // update the PC with the selected region value(s)
          const updatedModelParam = _.cloneDeep(this.geoModelParam) as ModelParameter;
          // ensure that both choices and labels exist
          const updatedChoices = _.clone(updatedModelParam.choices) as Array<string>;
          const updatedChoicesLabels = updatedModelParam.choices_labels === undefined || updatedModelParam.choices_labels.length === 0 ? _.clone(updatedModelParam.choices) as Array<string> : _.clone(updatedModelParam.choices_labels) as Array<string>;
          const formattedRegion = (region: GeoRegionDetail) => {
            const validSelectedRegion = region.path;
            switch (updatedModelParam.additional_options.geo_region_format) {
              case undefined: // undefined preference for region format -> fall back to full region path
              case GeoAttributeFormat.Full_GADM_PATH:
                return validSelectedRegion;
              case GeoAttributeFormat.GADM_Code:
                return region.code;
              case GeoAttributeFormat.Bounding_Box:
                return region.bbox;
            }
          };
          selectedRegions.forEach(sr => {
            const selectedRegionValue = formattedRegion(sr);
            if (!updatedChoices.includes(selectedRegionValue)) {
              updatedChoices.push(selectedRegionValue);
              updatedChoicesLabels.push(sr.label);
            }
          });
          updatedModelParam.choices = updatedChoices;
          updatedModelParam.choices_labels = updatedChoicesLabels;
          this.$emit('update-model-parameter', updatedModelParam);
        }
      }
    },
    getModelRunById(runId: string) {
      return this.allModelRunData.find(runData => runData.id === runId);
    },
    prepareDelete(runId: string) {
      this.idToDelete = runId;
      this.showDeleteModal();
    },
    async deleteWithRun(modelRun: any) {
      if (modelRun) {
        const modelRunDeleted = _.cloneDeep(modelRun);
        modelRunDeleted.status = ModelRunStatus.Deleted;
        await updateModelRun(modelRunDeleted);
        // This is done for responsiveness so that the user immediately knows when a run is deleted
        this.fetchData();
      }
    },
    async deleteRun() {
      const modelRun = this.getModelRunById(this.idToDelete);
      await this.deleteWithRun(modelRun);
      this.hideDeleteModal();
    },
    hideDeleteModal() {
      this.showDelete = false;
    },
    showDeleteModal() {
      this.showDelete = true;
    },
    async retryRun(runId: string) {
      const modelRun = this.getModelRunById(runId);
      if (modelRun) {
        createModelRun(modelRun.model_id, modelRun.model_name, modelRun.parameters, modelRun.is_default_run);
      }
      await this.deleteWithRun(modelRun);
    },
    // TODO: Refactor this to use the function for creating model runs.
    async createRunWithDefaults() {
      // send the request to the server
      const metadata = this.metadata;
      try {
        if (metadata && isModel(metadata)) {
          await API.post('maas/model-runs', {
            model_id: metadata.data_id,
            model_name: metadata?.name,
            parameters: metadata.parameters.map(param => {
              return {
                name: param.name,
                value: param.default
              };
            }),
            is_default_run: true
          });
        }
      } catch (e) {
        this.toaster('Run failed', 'error', true);
      }
    },
    removeTagFromSelectedRuns(tag: string) {
      this.selectedScenarios.forEach(run => {
        // NOTE: this will automatically refresh the rendered tags
        run.tags = run.tags.filter(_tag => _tag !== tag);
      });
      removeModelRunsTag(this.selectedScenarios.map(run => run.id), tag);
    }
  }
});
</script>

<style lang="scss" scoped>

@import '~styles/variables';
@import '~flatpickr/dist/flatpickr.css';

$cardSpacing: 10px;


.breakdown-button {
  margin: 0 1rem;
};

.dataset-link {
  text-decoration: underline;
}

.datacube-card-parent {
  width: 100%;
  display: flex;
}

.datacube-card-container {
  background-color: $background-light-1;
  border: 2px solid $separator;
  border-radius: 3px;
  display: flex;
  flex: 1 1 auto;
  width: 100%;
}


.drilldown {
  height: 100%;
  box-shadow: none;
}

.capture-box {
  padding-top: $cardSpacing;
  padding-left: $cardSpacing;
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
  margin-right: $cardSpacing;

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
  display: flex;
  flex-direction: column;
}

.center-column,
.scenario-selector {
  margin-bottom: $cardSpacing;
  margin-right: $cardSpacing;
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
  display: flex;
  align-items: center;
  .btn {
    margin-left: 2px;
  }
  .checkbox {
    margin-right: 10px;
  }
}

.relative-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
}

.timeseries-chart {
  flex: 1;
  min-height: 0;
  min-width: 0;
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
    .top-padding {
      height: 19px;
    }
    div {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
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
  .dropdown-config:not(:first-child) {
    margin-left: 5px;
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

.tags-area-container {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  max-height: 41px;
  overflow: auto;
}

.model-runs-search-bar {
  margin-top: 2px;
}

.scenario-count {
  color: $label-color;
}

.new-runs-date-picker-container {
  display: flex;
  width: 100%;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  .date-picker-input {
    border-width: thin;
    width: 100%;
    background-color: lightgray;
    cursor: auto;
  }
  .date-picker-buttons {
      padding: 4px 8px;
    }
}

.viz-options-modal-mask {
  isolation: isolate;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, .25);
  // Render above map attribution text
  z-index: 3;
}

$drilldownWidth: 25vw;
.viz-options-modal {
  background: $background-light-1;
  width: calc(#{$drilldownWidth} + 20px);
  position: absolute;
  right: 0;
  top: calc(calc(#{$navbar-outer-height} * 2) + 10px);
  bottom: 10px;
  overflow-y: auto;
  padding: 10px;
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;

  h4 {
    @include header-secondary;
    margin-top: 10px;
    margin-bottom: 20px;
  }
}

</style>
