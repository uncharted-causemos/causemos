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
          <button
            class="btn btn-default breakdown-button"
            @click="toggleSearchBar=!toggleSearchBar"
          >
            <i class="fa fa-search"></i>
          </button>
          <slot name="datacube-model-header-collapse" />
        </header>
        <div
          v-if="isModelMetadata && toggleSearchBar"
          style="display: flex; align-items: center">
          <model-runs-search-bar
            :data="modelRunsSearchData"
            :filters="searchFilters"
            @filters-updated="onModelRunsFiltersUpdated" />
          <slot name="search-filters-controls" />
        </div>
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
          :model-param="modelParam"
          @close="onGeoSelectionModalClose" />
        <rename-modal
          v-if="showTagNameModal"
          :modal-title="'Tag Name'"
          @confirm="addNewTag"
          @cancel="showTagNameModal = false"
        />
        <modal-datacube-scenario-tags
          v-if="showScenarioTagsModal === true"
          :all-model-run-data="allModelRunData"
          @close="showScenarioTagsModal=false" />
        <div class="flex-row">
          <!-- if has multiple scenarios -->
          <div v-if="isModelMetadata" class="scenario-selector">
            <div class="tags-area-container">
              <div class="tag-labels-container">
                <div v-for="tag in topRunTags" :key="tag.label"
                  class="tag-label"
                  :style="{ backgroundColor: tag.selected ? 'lightblue' : 'lightgray' }"
                  @click="onRunTagSelection(tag)">
                  {{tag.label}}
                  <span class="tags-label-runs-count">{{tag.count}}</span>
                </div>
              </div>
              <div style="font-size: small; display: flex; align-items: center">
                <a
                  class="see-all-tags"
                  @click="showScenarioTagsModal=true">
                  see all tags
                </a>
                <i
                  class="fa fa-plus-circle"
                  :class="{
                    'add-new-tag-disabled': selectedScenarioIds.length === 0,
                    'add-new-tag': selectedScenarioIds.length > 0
                  }"
                  @click="if(selectedScenarioIds.length > 0) {showTagNameModal=true;}" ></i>
              </div>
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
                  :class="[
                    `card-count-${outputSpecs.length < 5 ? outputSpecs.length : 'n'}`
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
              v-if="currentTabView === 'data' && mainModelOutput && isModelMetadata"
              :metadata="metadata"
              :all-model-run-data="allModelRunData"
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
              <div
                class="dropdown-row"
                v-if="currentTabView === 'data' && visibleTimeseriesData.length > 0"
              >
                <dropdown-button
                  v-if="temporalAggregationOptions.length > 0"
                  class="dropdown-config tour-temporal-agg-dropdown-config"
                  :class="{ 'attribute-invalid': selectedTemporalAggregation === '' }"
                  :inner-button-label="'Temporal Aggregation'"
                  :items="temporalAggregationOptions"
                  :selected-item="selectedTemporalAggregation"
                  @item-selected="setTemporalAggregationSelection"
                />
                <dropdown-button
                  v-if="temporalResolutionOptions.length > 0"
                  class="dropdown-config"
                  :class="{ 'attribute-invalid': selectedTemporalResolution === '' }"
                  :inner-button-label="'Temporal Resolution'"
                  :items="temporalResolutionOptions"
                  :selected-item="selectedTemporalResolution"
                  @item-selected="setTemporalResolutionSelection"
                />
              </div>
              <timeseries-chart
                v-if="currentTabView === 'data' && visibleTimeseriesData.length > 0"
                class="timeseries-chart"
                :key="activeDrilldownTab"
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
              <div
                v-if="currentTabView === 'data' && mapReady && regionalData !== null && outputSpecs.length > 0"
              >
                <div v-if="currentTabView === 'data'" class="dropdown-row">
                  <dropdown-button
                    v-if="spatialAggregationOptions.length > 0"
                    class="dropdown-config tour-spatial-agg-dropdown-config"
                    :class="{ 'attribute-invalid': selectedSpatialAggregation === '' }"
                    :inner-button-label="'Spatial Aggregation'"
                    :items="spatialAggregationOptions"
                    :selected-item="selectedSpatialAggregation"
                    @item-selected="setSpatialAggregationSelection"
                  />
                  <map-dropdown
                    class="dropdown-config"
                    :selectedBaseLayer="selectedBaseLayer"
                    :selectedDataLayer="selectedDataLayer"
                    @set-base-layer="setBaseLayer"
                    @set-data-layer="setDataLayer"
                  />
                </div>
              </div>
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
                      :show-tooltip="true"
                      :selected-layer-id="mapSelectedLayer"
                      :map-bounds="mapBounds"
                      :region-data="regionalData"
                      :selected-region-ids="selectedRegionIds"
                      :admin-layer-stats="adminLayerStats"
                      :grid-layer-stats="gridLayerStats"
                      :selected-base-layer="selectedBaseLayer"
                      :unit="unit"
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
import { computed, defineComponent, PropType, ref, Ref, toRefs, watchEffect } from 'vue';
import { useStore } from 'vuex';
import router from '@/router';

import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import DataAnalysisMap from '@/components/data/analysis-map-simple.vue';
import DatacubeScenarioHeader from '@/components/data/datacube-scenario-header.vue';
import DropdownControl from '@/components/dropdown-control.vue';
import DrilldownPanel from '@/components/drilldown-panel.vue';
import DropdownButton from '@/components/dropdown-button.vue';
import MapDropdown from '@/components/data/map-dropdown.vue';
import MapLegend from '@/components/widgets/map-legend.vue';
import MessageDisplay from '@/components/widgets/message-display.vue';
import Modal from '@/components/modals/modal.vue';
import ModalConfirmation from '@/components/modals/modal-confirmation.vue';
import ModalGeoSelection from '@/components/modals/modal-geo-selection.vue';
import ModalNewScenarioRuns from '@/components/modals/modal-new-scenario-runs.vue';
import ModalDatacubeScenarioTags from '@/components/modals/modal-datacube-scenario-tags.vue';
import ModalCheckRunsExecutionStatus from '@/components/modals/modal-check-runs-execution-status.vue';
import ModelRunsSearchBar from '@/components/data/model-runs-search-bar.vue';
import ParallelCoordinatesChart from '@/components/widgets/charts/parallel-coordinates.vue';
import RadioButtonGroup from '@/components/widgets/radio-button-group.vue';
import RenameModal from '@/components/action-bar/rename-modal.vue';
import SmallTextButton from '@/components/widgets/small-text-button.vue';
import timeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';

import useAnalysisMapStats from '@/services/composables/useAnalysisMapStats';
import useDatacubeHierarchy from '@/services/composables/useDatacubeHierarchy';
import useOutputSpecs from '@/services/composables/useOutputSpecs';
import useParallelCoordinatesData from '@/services/composables/useParallelCoordinatesData';
import useQualifiers from '@/services/composables/useQualifiers';
import useRegionalData from '@/services/composables/useRegionalData';
import useScenarioData from '@/services/composables/useScenarioData';
import useSelectedTimeseriesPoints from '@/services/composables/useSelectedTimeseriesPoints';
import useTimeseriesData from '@/services/composables/useTimeseriesData';

import { getInsightById } from '@/services/insight-service';

import { ScenarioData } from '@/types/Common';
import {
  AggregationOption,
  DatacubeType,
  ModelRunStatus,
  SpatialAggregationLevel,
  TemporalAggregationLevel,
  TemporalResolutionOption,
  DatacubeGenericAttributeVariableType
} from '@/types/Enums';
import { DatacubeFeature, Indicator, Model, ModelParameter } from '@/types/Datacube';
import { DataState, Insight, ViewState } from '@/types/Insight';
import { ModelRun, PreGeneratedModelRunData, RunsTag } from '@/types/ModelRun';
import { OutputSpecWithId } from '@/types/Runoutput';

import { colorFromIndex } from '@/utils/colors-util';
import { isIndicator, isModel } from '@/utils/datacube-util';
import { initDataStateFromRefs, initViewStateFromRefs } from '@/utils/drilldown-util';
import { BASE_LAYER, DATA_LAYER } from '@/utils/map-util-new';

import { createModelRun, updateModelRun } from '@/services/new-datacube-service';
import { disableConcurrentTileRequestsCaching, enableConcurrentTileRequestsCaching } from '@/utils/map-util';
import API from '@/api/api';
import useToaster from '@/services/composables/useToaster';

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
    'update-model-parameter',
    'search-filters-updated'
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
    spatialAggregationOptions: {
      type: Array as PropType<AggregationOption[]>,
      default: []
    },
    temporalAggregationOptions: {
      type: Array as PropType<AggregationOption[]>,
      default: []
    },
    temporalResolutionOptions: {
      type: Array as PropType<AggregationOption[]>,
      default: []
    },
    initialSearchFilters: {
      type: Object as PropType<any | null>,
      default: null
    }
  },
  components: {
    BreakdownPane,
    DataAnalysisMap,
    DatacubeScenarioHeader,
    DrilldownPanel,
    DropdownButton,
    DropdownControl,
    MapDropdown,
    MapLegend,
    MessageDisplay,
    Modal,
    ModalCheckRunsExecutionStatus,
    ModalConfirmation,
    ModalGeoSelection,
    ModalDatacubeScenarioTags,
    ModalNewScenarioRuns,
    ModelRunsSearchBar,
    ParallelCoordinatesChart,
    RadioButtonGroup,
    RenameModal,
    SmallTextButton,
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
      initialSearchFilters,
      tabState
    } = toRefs(props);

    const datacubeCurrentOutputsMap = computed(() => store.getters['app/datacubeCurrentOutputsMap']);
    const projectType = computed(() => store.getters['app/projectType']);
    const tour = computed(() => store.getters['tour/tour']);

    const activeDrilldownTab = ref<string|null>('breakdown');
    const currentTabView = ref<string>('description');
    const potentialScenarioCount = ref<number|null>(0);
    const potentialScenarios = ref<ScenarioData[]>([]);
    const showDatasets = ref<boolean>(false);
    const newRunsMode = ref<boolean>(false);
    const isRelativeDropdownOpen = ref<boolean>(false);
    const showGeoSelectionModal = ref<boolean>(false);
    const modelParam = ref<ModelParameter | null>(null);
    const showNewRunsModal = ref<boolean>(false);
    const showModelRunsExecutionStatus = ref<boolean>(false);
    const showPercentChange = ref<boolean>(true);
    const mapReady = ref<boolean>(false);
    const selectedTimestamp = ref(null) as Ref<number | null>;
    const breakdownOption = ref<string | null>(null);
    const selectedAdminLevel = ref(0);
    const selectedBaseLayer = ref(BASE_LAYER.DEFAULT);
    const selectedDataLayer = ref(DATA_LAYER.ADMIN);
    const selectedScenarioIds = ref([] as string[]);
    const selectedScenarios = ref([] as ModelRun[]);
    const selectedSpatialAggregation = ref<AggregationOption>(AggregationOption.Mean);
    const selectedTemporalAggregation = ref<AggregationOption>(AggregationOption.Mean);
    const selectedTemporalResolution = ref<TemporalResolutionOption>(TemporalResolutionOption.Month);

    const toggleSearchBar = ref<boolean>(false);
    const showTagNameModal = ref<boolean>(false);
    const showScenarioTagsModal = ref<boolean>(false);

    const searchFilters = ref<any>({});

    const mainModelOutput = ref<DatacubeFeature | undefined>(undefined);
    const modelRunsFetchedAt = ref(0);

    // we are receiving metadata from above (i.e. consumers) and we should not be setting a new model-id here at this level
    const selectedModelId = computed(() => metadata.value?.id ?? null);

    const currentOutputIndex = computed(() => metadata.value?.id !== undefined ? datacubeCurrentOutputsMap.value[metadata.value?.id] : 0);
    const isModelMetadata = computed(() => metadata.value !== null && isModel(metadata.value));
    const isIndicatorDatacube = computed(() => metadata.value !== null && isIndicator(metadata.value));

    const allModelRunData = useScenarioData(selectedModelId, modelRunsFetchedAt);

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
    const canClickDataTab = computed(() => !isPublishing.value || hasDefaultRun.value || (metadata.value && isIndicator(metadata.value)));
    const {
      dimensions,
      ordinalDimensionNames,
      runParameterValues
    } = useParallelCoordinatesData(metadata, allModelRunData);

    const runningDefaultRun = computed(() => allModelRunData.value.some(run => run.is_default_run && (run.status === ModelRunStatus.Processing || run.status === ModelRunStatus.Submitted)));

    // apply initial data config for this datacube
    const initialSelectedRegionIds = ref<string[]>([]);
    const initialSelectedQualifierValues = ref<string[]>([]);
    const initialSelectedYears = ref<string[]>([]);

    const addNewTag = (tagName: string) => {
      selectedScenarios.value.forEach(s => s.tags.push(tagName));
      showTagNameModal.value = false;
      // TODO: update the backend for persistence
    };

    const runTags = ref<RunsTag[]>([]);

    watchEffect(() => {
      if (allModelRunData.value && allModelRunData.value.length > 0) {
        const tags: RunsTag[] = [];
        allModelRunData.value.forEach(run => {
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

    const topRunTags = computed(() => {
      const sortedRunTags = _.cloneDeep(runTags.value).sort((a, b) => b.count - a.count);
      return sortedRunTags.filter((item, indx) => indx < 3);
    });

    const onRunTagSelection = (tag: RunsTag) => {
      // unselect all other tags (except this one being toggled) in case of a previous selection
      const updatedRunTags = _.cloneDeep(runTags.value);
      updatedRunTags.forEach(t => {
        if (t.label !== tag.label) {
          t.selected = false;
        } else {
          // toggle selection of the run tag
          t.selected = !t.selected;
          tag = t; // must overwrite the local param since it points to the old data
        }
      });
      // update the ref so that DOM will pickup and rerender
      runTags.value = updatedRunTags;

      if (tag.selected) {
        // select all runs that match this tag
        const runsWithMatchingTag = allModelRunData.value.filter(r => r.status === ModelRunStatus.Ready && r.tags.includes(tag.label));
        if (runsWithMatchingTag.length > 0) {
          setSelectedScenarioIds(runsWithMatchingTag.map(r => r.id));
        }
      } else {
        // cancel run selection
        setSelectedScenarioIds([]);
      }
    };

    const setDatacubeCurrentOutputsMap = (updatedMap: any) => store.dispatch('app/setDatacubeCurrentOutputsMap', updatedMap);

    const setBaseLayer = (val: BASE_LAYER) => {
      selectedBaseLayer.value = val;
    };

    const setDataLayer = (val: DATA_LAYER) => {
      selectedDataLayer.value = val;
    };

    const setSpatialAggregationSelection = (spatialAgg: AggregationOption) => {
      selectedSpatialAggregation.value = spatialAgg;
    };

    const setTemporalAggregationSelection = (temporalAgg: AggregationOption) => {
      selectedTemporalAggregation.value = temporalAgg;
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

    const updateTabView = (val: string) => {
      currentTabView.value = val;
    };
    const onMapLoad = () => {
      emit('on-map-load');
    };

    watchEffect(() => {
      if (initialSearchFilters.value) {
        searchFilters.value = initialSearchFilters.value;
      }
    });

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
      }
    });

    const clearRouteParam = () => {
      // fix to avoid double history later
      router.push({
        query: {
          insight_id: undefined,
          datacube_id: selectedModelId.value
        }
      }).catch(() => {});
    };

    const setSelectedScenarioIds = (newIds: string[]) => {
      if (isIndicatorDatacube.value) {
        if (_.isEqual(selectedScenarioIds.value, newIds)) return;
      }
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
          allModelRunData.value.some(run => {
            return runId === run.id && filteredRuns.push(run);
          });
          return filteredRuns;
        }, []);
      } else {
        updateTabView('description');
      }
    };

    const modelRunsSearchData = computed(() => {
      const result: {[key: string]: any} = {};
      dimensions.value.forEach(dim => {
        result[dim.name] = {
          display_name: dim.display_name,
          type: dim.type
        };
        if (dim.choices && dim.choices.length > 0) {
          result[dim.name].values = _.uniq(Array.from(dim.choices));
        }
      });
      return result;
    });

    const onModelRunsFiltersUpdated = (filters: any) => {
      // parse and apply filters to the model runs data
      const selectedRunIDS: string[] = [];
      let filteredRuns = allModelRunData.value.filter(r => r.status === ModelRunStatus.Ready);
      if (_.isEmpty(filters) || filters.clauses.length === 0) {
        // do nothing; since we need to cancel existing filters, if any
      } else {
        const dimTypeMap: { [key: string]: string } = dimensions.value.reduce(
          (obj, item) => Object.assign(obj, { [item.name]: item.type }), {});
        const clauses = filters.clauses;
        clauses.forEach((c: any) => {
          const filterField: string = c.field; // the field to filter on
          const filterValues = c.values; // array of values to filter upon
          const isNot = !c.isNot; // is the filter reversed?
          filteredRuns = filteredRuns.filter(v => {
            const paramsMatchingFilterField = v.parameters.find(p => p.name === filterField);
            if (paramsMatchingFilterField !== undefined) {
              // this is a param filter
              // so we can search this parameters array directly
              //  depending on the param type, we could have range (e.g., rainful multiplier range) or a set of values (e.g., one or more selected countries)
              if (dimTypeMap[filterField] === DatacubeGenericAttributeVariableType.Int || dimTypeMap[filterField] === DatacubeGenericAttributeVariableType.Float) {
                const filterRange = filterValues[0]; // range bill provides the filter range as array of two values within an array
                return paramsMatchingFilterField.value >= filterRange[0] && paramsMatchingFilterField.value <= filterRange[1];
              } else {
                return filterValues.includes(paramsMatchingFilterField.value.toString()) === isNot;
              }
            } else {
              // this is an output filter
              //  we need to search the array of v.output_agg_values
              // note: this will always be a numeric range
              const runOutputValue = v.output_agg_values[0].value;
              const filterRange = filterValues[0]; // range bill provides the filter range as array of two values within an array
              return runOutputValue >= filterRange[0] && runOutputValue <= filterRange[1];
            }
          });
        });
        selectedRunIDS.push(...filteredRuns.map(r => r.id));
      }
      searchFilters.value = filters;
      emit('search-filters-updated', searchFilters.value);
      setSelectedScenarioIds(selectedRunIDS);
    };

    watchEffect(() => {
      if (initialDataConfig.value && !_.isEmpty(initialDataConfig.value)) {
        if (initialDataConfig.value.selectedScenarioIds !== undefined) {
          setSelectedScenarioIds(_.clone(initialDataConfig.value.selectedScenarioIds));
        }
        if (initialDataConfig.value.selectedRegionIds !== undefined) {
          initialSelectedRegionIds.value = _.clone(initialDataConfig.value.selectedRegionIds);
        }
        if (initialDataConfig.value.selectedQualifierValues !== undefined) {
          initialSelectedQualifierValues.value = _.clone(initialDataConfig.value.selectedQualifierValues);
        }
      }
    });

    const toaster = useToaster();
    const clickData = (tab: string) => {
      if (tab !== 'data' || canClickDataTab.value) {
        // FIXME: This code to select a model run when switching to the data tab
        // should be in a watcher on the parent component to be more robust,
        // rather than in this button's click handler.

        if (isModelMetadata.value && selectedScenarioIds.value.length === 0) {
          // clicking on either the 'data' or 'pre-rendered-viz' tabs when no runs is selected should always pick the baseline run
          const readyRuns = allModelRunData.value.filter(r => r.status === ModelRunStatus.Ready && r.is_default_run);
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

      if (newRunsMode.value) {
        // clear any selected scenario and show the model desc page
        updateScenarioSelection({ scenarios: [] });
      }
    };

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
      if (allModelRunData.value !== null && allModelRunData.value.length > 0) {
        const runsWithPreGenDataAvailable = _.some(allModelRunData.value, r => r.pre_gen_output_paths && _.some(r.pre_gen_output_paths, p => p.coords === undefined));
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

    const dataPaths = computed((): string[] => {
      if (!_.isNull(metadata.value)) {
        const isAModel: boolean = isModel(metadata.value);
        return _.compact(isAModel
          ? allModelRunData.value
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
      selectedTimeseriesPoints
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
    } = useAnalysisMapStats(outputSpecs, regionalData, relativeTo, selectedDataLayer, selectedAdminLevel, showPercentChange);

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
        selectedTemporalResolution
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
        visibleTimeseriesData
      );

      store.dispatch('insightPanel/setDataState', dataState);
    });

    return {
      addNewTag,
      allModelRunData,
      activeDrilldownTab,
      adminLayerStats,
      baselineMetadata,
      breakdownOption,
      canClickDataTab,
      colorFromIndex,
      currentTabView,
      dataPaths,
      defaultRunButtonCaption,
      dimensions,
      drilldownTabs: DRILLDOWN_TABS,
      fetchData,
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
      modelParam,
      modelRunsSearchData,
      newRunsMode,
      onMapLoad,
      onModelRunsFiltersUpdated,
      onNewScenarioRunsModalClose,
      onRunTagSelection,
      onSyncMapBounds,
      onTabClick,
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
      topRunTags,
      searchFilters,
      selectedAdminLevel,
      selectedBaseLayer,
      selectedDataLayer,
      selectedPreGenDataItem,
      selectedQualifierValues,
      selectedRegionIds,
      selectedScenarioIds,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      selectedTimeseriesPoints,
      selectedTimestamp,
      selectedYears,
      setSelectedAdminLevel,
      setBreakdownOption,
      setBaseLayer,
      setDataLayer,
      setRelativeTo,
      setSpatialAggregationSelection,
      setSelectedTimestamp,
      setTemporalAggregationSelection,
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
      toggleSearchBar,
      unit,
      updateStateFromInsight,
      updateGeneratedScenarios,
      updateMapCurSyncedZoom,
      updateScenarioSelection,
      showPercentChange,
      visibleTimeseriesData
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
    showDelete: false
  }),
  methods: {
    openGeoSelectionModal(modelParam: ModelParameter) {
      this.showGeoSelectionModal = true;
      this.modelParam = modelParam;
    },
    onGeoSelectionModalClose(eventData: any) {
      this.showGeoSelectionModal = false;
      if (!eventData.cancel) {
        if (eventData.selectedRegions && eventData.selectedRegions.length > 0) {
          // update the PC with the selected region value(s)
          const updatedModelParam = _.cloneDeep(this.modelParam) as ModelParameter;
          const updatedChoices = _.clone(updatedModelParam.choices) as Array<string>;
          const updatedChoicesLabels = _.clone(updatedModelParam.choices_labels) as Array<string>;
          eventData.selectedRegions.forEach((sr: string) => {
            if (!updatedChoices.includes(sr)) {
              updatedChoices.push(sr);
              updatedChoicesLabels.push(sr);
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
            parameters: metadata.parameters,
            is_default_run: true
          });
        }
      } catch (e) {
        this.toaster('Run failed', 'error', true);
      }
    }
  }
});
</script>

<style lang="scss" scoped>

@import '~styles/variables';

$fullscreenTransition: all 0.5s ease-in-out;

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
  margin-left: 1rem;
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

.tags-area-container {
  display: flex;
  align-items: center;
  font-size: smaller;
  text-align: center;
  justify-content: space-between;

  .tag-labels-container {
    display: flex;
    align-items: center;

    .tag-label {
      background-color:lightgray;
      margin-left: 2px;
      padding: 4px;
      border-style: solid;
      border-radius: 4px;
      border-width: 1px;
      border-color: rgb(180, 180, 180);
      cursor: pointer;

      &:hover {
        background-color: darkgray !important;
      }

      .tags-label-runs-count {
        padding-left: 6px;
        padding-right: 6px;
        background-color: white;
        border-style: solid;
        border-radius: 50%;
        border-width: 1px;
        border-color: lightgray;
      }
    }
  }

  .see-all-tags {
    color: blue;
    cursor: pointer;
    margin-left: 2px;
    margin-right: 2px;
  }

  .add-new-tag {
    cursor: pointer;
    font-size: medium;
    &:hover {
      color: blue;
    }
  }
  .add-new-tag-disabled {
    color: lightgray;
    font-size: medium;
    &:hover {
      cursor: not-allowed;
    }
  }
}

</style>
