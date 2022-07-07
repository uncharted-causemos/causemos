<template>
  <div class="datacube-card-parent">
    <div class="datacube-card-container">
      <div class="capture-box">
        <header>
          <slot name="datacube-model-header" />
          <button
            class="btn breakdown-button"
            :onClick="() => isBreakdownPaneOpen = !isBreakdownPaneOpen"
          >
            {{ isBreakdownPaneOpen === false ? 'Show' : 'Hide' }} Breakdown
          </button>
          <slot name="datacube-model-header-collapse" />
        </header>
        <modal-new-scenario-runs
          v-if="isModel(metadata) && showNewRunsModal === true"
          :metadata="metadata"
          :potential-scenarios="potentialScenarios"
          :selected-dimensions="dimensions"
          :runtime-stats="runtimeStats"
          @close="onNewScenarioRunsModalClose" />
        <modal-check-runs-execution-status
          v-if="isModel(metadata) && showModelRunsExecutionStatus === true"
          :metadata="metadata"
          :potential-scenarios="runParameterValues"
          @close="showModelRunsExecutionStatus = false"
          @delete="prepareDelete"
          @retry="retryRun"
        />
        <modal-geo-selection
          v-if="showGeoSelectionModal === true"
          :model-param="geoModelParam"
          :metadata="metadata"
          @close="onGeoSelectionModalClose" />
        <rename-modal
          v-if="showTagNameModal"
          :modal-title="`Add new tag to ${selectedScenarioIds.length} selected run${selectedScenarioIds.length !== 1 ? 's' : ''}`"
          @confirm="addNewTag"
          @cancel="showTagNameModal = false"
        />
        <rename-modal
          v-if="showRunNameModal"
          :modal-title="'Rename run'"
          :current-name="selectedScenarios[0].name"
          @confirm="renameRun"
          @cancel="showRunNameModal = false"
        />
        <div class="flex-row">
          <!-- if has multiple scenarios -->
          <div v-if="isModel(metadata)" class="scenario-selector">
            <div class="tags-area-container">
              <span class="scenario-count" v-if="selectedScenarioIds.length === 0">
                {{scenarioCount}} model run{{scenarioCount === 1 ? '' : 's'}}.
              </span>
              <span class="scenario-count" v-if="selectedScenarioIds.length > 0">
                {{selectedScenarioIds.length}} model run{{selectedScenarioIds.length === 1 ? '' : 's'}} selected.
              </span>
              <small-text-button
                v-if="isPublishing && selectedScenarios.length === 1"
                :label="'Rename ' + selectedScenarios[0].name"
                @click="showRunNameModal = true"
              >
                <template #leading>
                  <i class="fa fa-edit" />
                </template>
              </small-text-button>
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
              v-if="isModel(metadata)"
              :data="modelRunsSearchData"
              :filters="modelRunSearchFilters"
              @filters-updated="filters => modelRunSearchFilters = filters"
            />
            <div v-if="dateModelParam">
              <div v-if="newRunsMode" ref="datePickerElement" class="new-runs-date-picker-container">
                <input class="date-picker-input" :placeholder="dateModelParam.type === DatacubeGenericAttributeVariableType.DateRange ? 'Select date range..' : 'Select date..'" type="text" v-model="dateParamPickerValue" autocomplete="off" data-input />
                <a class="btn date-picker-buttons" title="toggle" data-toggle>
                    <i class="fa fa-calendar"></i>
                </a>
                <a class="btn date-picker-buttons" title="clear" data-clear>
                    <i class="fa fa-close"></i>
                </a>
              </div>
              <temporal-facet
                v-else
                :model-run-data="filteredRunData"
                :selected-scenarios="selectedScenarioIds"
                :model-parameter="dateModelParam"
                @update-scenario-selection="setSelectedScenarioIds"
              />
            </div>
            <parallel-coordinates-chart
              class="pc-chart"
              :dimensions-data="runParameterValues"
              :selected-dimensions="dimensions"
              :initial-data-selection="selectedScenarioIds"
              :new-runs-mode="newRunsMode"
              @select-scenario="setSelectedScenarios"
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
              class="btn toggle-new-runs-button btn-call-to-action"
              :disabled="metadata && metadata.status === DatacubeStatus.Deprecated"
              @click="createRunWithDefaults()"
            >
              {{ defaultRunButtonCaption }}
            </button>
            <button
              v-if="!isPublishing || hasDefaultRun"
              class="btn toggle-new-runs-button"
              :class="{
                'btn-call-to-action': !newRunsMode,
                '': newRunsMode
              }"
              :disabled="metadata && metadata.status === DatacubeStatus.Deprecated"
              @click="toggleNewRunsMode()"
            >
              {{ newRunsMode ? 'Cancel' : 'Request new runs' }}
            </button>
            <button
              v-if="newRunsMode"
              class="btn btn-call-to-action"
              :class="{ 'disabled': potentialScenarioCount === 0}"
              @click="requestNewModelRuns()"
            >
              Review {{ potentialScenarioCount }} new scenario{{ potentialScenarioCount !== 1 ? 's' : '' }}
            </button>
            <button
              v-else
              class="btn "
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
                  v-if="currentTabView === DatacubeViewMode.Data && (visibleTimeseriesData.length > 1 || relativeTo !== null)"
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
                    class="btn "
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
                  class="btn "
                  :class="{ 'viz-option-invalid': someVizOptionsInvalid }"
                  title="Toggle visualization options"
                  :onClick="() => activeVizOptionsTab = (activeVizOptionsTab === null ? 'vizoptions' : null)"
                >
                  <i class="fa fa-gear"></i>
                </button>
              </div>
            </div>

            <!-- Description tab content -->
            <slot name="datacube-description" v-if="currentTabView === DatacubeViewMode.Description" />

            <!-- Pre-rendered viz tab content -->
            <!--
              outputSpecs.length > 0 means we have one or more selected run
              FIXME: this should be done directly against allModelRunData
            -->
            <div
              v-if="currentTabView === DatacubeViewMode.Media && outputSpecs.length > 0"
              style="display: flex; height: 100%; flex-direction: column">

              <!-- a global list
                of all pre-rendered-viz items from all runs,
                and enable selection by item name/id instead of index
                which won't work when different model runs have different list of pre-rendered items -->
              <div v-if="preGenDataIds.length > 0">
                <div style="display: flex; padding: 5px;">
                  <div style="padding-right: 10px">Selected Viz:</div>
                    <select name="pre-gen-outputs" @change="selectedPreGenDataId = preGenDataIds[$event.target.selectedIndex]">
                      <option
                        v-for="pregenId in preGenDataIds" :key="pregenId"
                        :selected="pregenId === selectedPreGenDataId"
                      >
                        {{pregenId}}
                      </option>
                    </select>
                  <button
                    v-if="firstSelectedPreGenOutput && firstSelectedPreGenOutput.type === 'image'"
                    type="button"
                    class="btn btn-sm btn-call-to-action"
                    style="margin-left: 10px"
                    @click="savePreGenAsInsight">
                    <i class="fa fa-fw fa-star fa-lg" />
                    Save As Insight
                  </button>
                </div>
                <div v-if="firstSelectedPreGenOutput && firstSelectedPreGenOutput.caption" style="padding-left: 5px; padding-right: 10px">{{firstSelectedPreGenOutput.caption}}</div>
              </div>

              <div class="column card-maps-container" style="flex-direction: revert;">
                <div v-for="(spec, indx) in outputSpecs" :key="spec.id" :set="pregenDataForSpec = getSelectedPreGenOutput(spec.id)"
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
                      :src="pregenDataForSpec.embeddedSrc ?? pregenDataForSpec.file"
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
                    <iframe
                      v-if="pregenDataForSpec.type === 'web'"
                      :src="pregenDataForSpec.file"
                      class="pre-rendered-content" style="height: 100%;">
                    </iframe>
                  </template>
                  <template v-else>
                    No pre-generated data available for some selected model run(s)!
                  </template>
                </div>
              </div>
            </div>

            <datacube-scenario-header
              v-if="currentTabView === DatacubeViewMode.Data && activeFeature && isModel(metadata)"
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
                  class="btn btn-call-to-action"
                  @click="showDatasets = false"
                >
                  Close
                </div>
              </template>
            </modal>


            <!-- Data tab content -->
            <div v-if="currentTabView === DatacubeViewMode.Data" class="column">
              <timeseries-chart
                v-if="visibleTimeseriesData.length > 0 && breakdownOption !== SPLIT_BY_VARIABLE"
                class="timeseries-chart"
                :timeseries-data="timeseriesData"
                :selected-temporal-resolution="selectedTemporalResolution"
                :selected-timestamp="selectedTimestamp"
                :breakdown-option="breakdownOption"
                :unit="timeseriesUnit"
                @select-timestamp="setSelectedTimestamp"
              />
              <datacube-comparative-timeline-sync
                v-if="breakdownOption === SPLIT_BY_VARIABLE && selectedFeatureNames.size > 0 && globalTimeseries.length > 0"
                :timeseriesData="globalTimeseries"
                :timeseriesToDatacubeMap="timeseriesToDatacubeMap"
                :selected-timestamp="selectedGlobalTimestamp"
                :selected-timestamp-range="selectedGlobalTimestampRange"
                :breakdown-option="breakdownOption"
                @select-timestamp="setSelectedGlobalTimestamp"
                @select-timestamp-range="setSelectedGlobalTimestampRange"
              />
              <p
                v-if="
                  breakdownOption !== null &&
                  ((visibleTimeseriesData.length === 0 && breakdownOption !== SPLIT_BY_VARIABLE) ||
                  (selectedFeatureNames.size === 0 && breakdownOption === SPLIT_BY_VARIABLE))
                "
              >
                Please select one or more
                {{
                  breakdownOption === SpatialAggregationLevel.Region
                    ? 'regions'
                    : breakdownOption === TemporalAggregationLevel.Year
                    ? 'years'
                    : breakdownOption === SPLIT_BY_VARIABLE
                    ? 'variables'
                    : 'qualifier values'
                }}
                , or choose 'Split by none'.
              </p>
              <div class="card-maps-box" v-if="breakdownOption === SPLIT_BY_VARIABLE">
                <div v-if="selectedFeatures.length > 0" class="card-maps-legend-container">
                  <span v-if="selectedFeatures.length > 1" class="top-padding"></span>
                </div>
                <div
                  v-if="regionalData !== null"
                  class="card-maps-container">
                  <div
                    v-for="({ name: featureName }, indx) in selectedFeatures"
                    :key="featureName"
                    class="card-map-container"
                    :class="[
                      `card-count-${selectedFeatures.length < 5 ? selectedFeatures.length : 'n'}`
                    ]"
                  >
                    <span
                      v-if="selectedFeatures.length > 1"
                      :style="{ color: colorFromIndex(indx)}"
                    >
                      {{ featureName }}
                    </span>
                    <region-map
                      class="card-map"
                      :style="{ borderColor: colorFromIndex(indx) }"
                      :data="regionMapData[featureName]"
                      :map-bounds="mapBounds"
                      :popup-Formatter="popupFormatter"
                      :region-filter="selectedRegionIdsAtAllLevels"
                      :selected-admin-level="selectedAdminLevel"
                      @sync-bounds="onSyncMapBounds"
                    />
                  </div>
                </div>
                <div
                  v-else-if="currentTabView === DatacubeViewMode.Data"
                  class="card-maps-container"
                >
                  <!-- Empty div to reduce jumpiness when the maps are loading -->
                  <div class="card-map" />
                </div>
                <div v-if="selectedFeatures.length > 0" class="card-maps-legend-container">
                  <span v-if="selectedFeatures.length > 1" class="top-padding"></span>
                </div>
              </div>
              <div class="card-maps-box" v-if="breakdownOption !== SPLIT_BY_VARIABLE">
                <div v-if="outputSpecs.length > 0 && mapLegendData.length === 2" class="card-maps-legend-container">
                  <span v-if="outputSpecs.length > 1" class="top-padding"></span>
                  <map-legend :ramp="mapLegendData[0]" :label-position="{ top: true, right: false }" :isContinuos="isContinuousScale" />
                </div>
                <div
                  v-if="mapReady && currentTabView === DatacubeViewMode.Data && regionalData !== null"
                  class="card-maps-container">
                  <div
                    v-for="(spec, indx) in outputSpecs"
                    :key="spec.id"
                    class="card-map-container"
                    :class="[
                      {'is-default-run': spec.isDefaultRun },
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
                      :selected-layer-id="getSelectedLayer(spec.id)"
                      :map-bounds="isSplitByRegionMode ? mapBoundsForEachSpec[spec.id] : mapBounds"
                      :region-data="regionalData"
                      :raw-data="rawDataPointsList[indx]"
                      :selected-regions="mapSelectedRegions"
                      :admin-layer-stats="adminLayerStats"
                      :grid-layer-stats="gridLayerStats"
                      :points-layer-stats="pointsLayerStats"
                      :selected-base-layer="selectedBaseLayer"
                      :unit="unit"
                      :color-options="mapColorOptions"
                      :show-percent-change="showPercentChange"
                      @sync-bounds="(bounds) => isSplitByRegionMode ? () => {} : onSyncMapBounds(bounds)"
                      @on-map-load="onMapLoad"
                      @zoom-change="updateMapCurSyncedZoom"
                      @map-update="recalculateGridMapDiffStats"
                    />
                  </div>
                </div>
                <div
                  v-else-if="currentTabView === DatacubeViewMode.Data"
                  class="card-maps-container"
                >
                  <!-- Empty div to reduce jumpiness when the maps are loading -->
                  <div class="card-map" />
                </div>
                <div v-if="outputSpecs.length > 0" class="card-maps-legend-container">
                  <span v-if="outputSpecs.length > 1" class="top-padding"></span>
                  <map-legend :ramp="mapLegendData.length === 2 ? mapLegendData[1] : mapLegendData[0]" :isContinuos="isContinuousScale" />
                </div>
              </div>
            </div>
          </div>
          <div style="position: relative">
            <drilldown-panel
              class="drilldown"
              :active-tab-id="'tabId'"
              :has-transition="false"
              :hide-close="true"
              :is-open="isBreakdownPaneOpen"
              :tabs="[{ name: 'Breakdown', id: 'tabId', icon: '' }]"
              @close="() => { isBreakdownPaneOpen = false }"
            >
              <template #content>
                <breakdown-pane
                  v-if="isBreakdownPaneOpen"
                  :selected-admin-level="selectedAdminLevel"
                  :qualifier-breakdown-data="qualifierBreakdownData"
                  :qualifier-fetch-info="qualifierFetchInfo"
                  :regional-data="regionalData"
                  :temporal-breakdown-data="temporalBreakdownData"
                  :feature-breakdown-data="featureBreakdownData"
                  :selected-spatial-aggregation="selectedSpatialAggregation"
                  :selected-temporal-aggregation="selectedTemporalAggregation"
                  :selected-temporal-resolution="selectedTemporalResolution"
                  :selected-timestamp="selectedTimestamp"
                  :selected-scenario-ids="selectedScenarioIds"
                  :selected-region-ids="selectedRegionIds"
                  :selected-region-ids-at-all-levels="selectedRegionIdsAtAllLevels"
                  :selected-qualifier-values="selectedQualifierValues"
                  :selected-breakdown-option="breakdownOption"
                  :selected-timeseries-points="selectedTimeseriesPoints"
                  :selected-years="selectedYears"
                  :selected-feature-names="selectedFeatureNames"
                  :reference-options="availableReferenceOptions"
                  :unit="unit"
                  @toggle-is-region-selected="toggleIsRegionSelected"
                  @toggle-is-qualifier-selected="toggleIsQualifierSelected"
                  @toggle-is-year-selected="toggleIsYearSelected"
                  @toggle-is-output-variable-selected="toggleIsFeatureSelected"
                  @toggle-reference-options="toggleReferenceOptions"
                  @set-selected-admin-level="setSelectedAdminLevel"
                  @set-breakdown-option="setBreakdownOption"
                  @request-qualifier-data="requestAdditionalQualifier"
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
                  :item-id="itemId"
                  :aggregation-options="filteredAggregationOptions"
                  :resolution-options="temporalResolutionOptions"
                  :selected-spatial-aggregation="selectedSpatialAggregation"
                  :selected-temporal-aggregation="selectedTemporalAggregation"
                  :selected-transform="selectedTransform"
                  :selected-resolution="selectedTemporalResolution"
                  :selected-base-layer="selectedBaseLayer"
                  :selected-data-layer="selectedDataLayer"
                  :selected-data-layer-transparency="selectedDataLayerTransparency"
                  :color-scheme-reversed="colorSchemeReversed"
                  :selected-color-scheme-name="selectedColorSchemeName"
                  :selected-color-scale-type="selectedColorScaleType"
                  :number-of-color-bins="numberOfColorBins"
                  :selected-color-scheme="finalColorScheme"
                  @set-spatial-aggregation-selection="setSpatialAggregationSelection"
                  @set-temporal-aggregation-selection="setTemporalAggregationSelection"
                  @set-resolution-selection="setTemporalResolutionSelection"
                  @set-base-layer-selection="setBaseLayer"
                  @set-data-layer-transparency-selection="setDataLayerTransparency"
                  @set-data-layer-selection="setDataLayer"
                  @set-color-scheme-reversed="setColorSchemeReversed"
                  @set-color-scheme-name="setColorSchemeName"
                  @set-color-scale-type="setColorScaleType"
                  @set-number-color-bins="setNumberOfColorBins"
                  @set-transform-selection="setTransformSelection"
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
import { computed, defineComponent, nextTick, PropType, ref, toRefs, watch, watchEffect } from 'vue';
import { useStore } from 'vuex';
import router from '@/router';
import * as d3 from 'd3';
import flatpickr from 'flatpickr';

import BreakdownPane from '@/components/drilldown-panel/breakdown-pane.vue';
import VizOptionsPane from '@/components/drilldown-panel/viz-options-pane.vue';
import DataAnalysisMap from '@/components/data/analysis-map.vue';
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

import useDatacube from '@/services/composables/useDatacube';
import useParallelCoordinatesData from '@/services/composables/useParallelCoordinatesData';

import { getInsightById } from '@/services/insight-service';
import { isDataSpaceDataState } from '@/utils/insight-util';
import { normalizeTimeseriesList } from '@/utils/timeseries-util';

import { BoxPlotStats, GeoRegionDetail, ScenarioData } from '@/types/Common';
import {
  AggregationOption,
  DatacubeGenericAttributeVariableType,
  DataTransform,
  GeoAttributeFormat,
  ModelRunStatus,
  SpatialAggregationLevel,
  TemporalAggregationLevel,
  TemporalResolutionOption,
  SPLIT_BY_VARIABLE,
  DatacubeViewMode, DatacubeStatus, ProjectType
} from '@/types/Enums';
import { Indicator, Model, ModelParameter } from '@/types/Datacube';
import { DataSpaceDataState, Insight, ViewState } from '@/types/Insight';
import { ModelRun, PreGeneratedModelRunData, RunsTag } from '@/types/ModelRun';

import {
  colorFromIndex,
  ColorScaleType,
  validateColorScaleType
} from '@/utils/colors-util';
import {
  getUnitString,
  isIndicator,
  isModel,
  TAGS,
  DEFAULT_DATE_RANGE_DELIMETER,
  convertRegionalDataToBarData
} from '@/utils/datacube-util';
import {
  initDataStateFromRefs,
  initViewStateFromRefs,
  fromStateSelectedRegionsAtAllLevels,
  validateSelectedRegions
} from '@/utils/drilldown-util';
import {
  BASE_LAYER,
  DATA_LAYER,
  SOURCE_LAYERS,
  getMapSourceLayer,
  popupFormatter,
  getActiveRegions
} from '@/utils/map-util-new';

import {
  addModelRunsTag,
  createModelRun,
  fetchImageAsBase64,
  removeModelRunsTag,
  updateModelRun
} from '@/services/new-datacube-service';
import { disableConcurrentTileRequestsCaching, enableConcurrentTileRequestsCaching } from '@/utils/map-util';
import API from '@/api/api';
import useToaster from '@/services/composables/useToaster';
import DatacubeComparativeTimelineSync from '@/components/widgets/datacube-comparative-timeline-sync.vue';
import RegionMap from '@/components/widgets/region-map.vue';
import { BarData } from '@/types/BarChart';
import { updateDatacubesOutputsMap } from '@/utils/analysis-util';
import { useRoute } from 'vue-router';
import { capitalize } from '@/utils/string-util';
import { getBboxForEachRegionId } from '@/services/geo-service';
import { getWeightQualifier } from '@/utils/qualifier-util';
import { BreakdownData } from '@/types/Datacubes';
import useActiveDatacubeFeature from '@/services/composables/useActiveDatacubeFeature';

const defaultRunButtonCaption = 'Run with default parameters';

export default defineComponent({
  name: 'DatacubeCard',
  emits: [
    'on-map-load',
    'update-model-parameter',
    'visible-timeseries-changed'
  ],
  props: {
    isPublishing: {
      type: Boolean,
      default: false
    },
    initialDataConfig: {
      type: Object as PropType<DataSpaceDataState>,
      default: null
    },
    initialViewConfig: {
      type: Object as PropType<ViewState>,
      default: null
    },
    tabState: {
      type: String,
      default: DatacubeViewMode.Description
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
      type: Array as PropType<TemporalResolutionOption[] | null>,
      default: null
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
    timeseriesChart,
    DatacubeComparativeTimelineSync,
    RegionMap
  },
  setup(props, { emit }) {
    const store = useStore();
    const route = useRoute();

    const {
      isPublishing,
      initialDataConfig,
      initialViewConfig,
      metadata,
      tabState,
      temporalResolutionOptions,
      aggregationOptions
    } = toRefs(props);

    const projectType = computed(() => store.getters['app/projectType']);
    const datacubeItemId = route.query.item_id as any;
    const itemId = computed<string>(() => {
      if (projectType.value === ProjectType.Analysis) {
        return datacubeItemId;
      } else {
        // domain model or indicator project, so use the data_id as the unique item id
        // this is in line with how the model-description component works for example
        return metadata.value?.id ?? metadata.value?.data_id;
      }
    });

    const newRunsMode = ref<boolean>(false);
    const toggleNewRunsMode = () => {
      newRunsMode.value = !newRunsMode.value;
    };

    const isPeriodicallyRefreshingModelRuns = computed(
      () => (newRunsMode.value === false && isModel(metadata.value) === true)
    );

    const {
      currentOutputIndex,
      activeFeature,
      activeFeatureName
    } = useActiveDatacubeFeature(metadata, itemId);

    const {
      dimensions,
      allModelRunData,
      filteredRunData,
      fetchModelRuns,
      selectedModelId,
      modelRunSearchFilters,
      datacubeHierarchy,
      selectedRegionIds,
      selectedRegionIdsAtAllLevels,
      referenceRegions,
      toggleIsRegionSelected,
      selectedScenarioIds,
      selectedAdminLevel,
      setSelectedAdminLevel,
      breakdownOption,
      setBreakdownOption,
      selectedScenarios,
      selectedSpatialAggregation,
      setSpatialAggregationSelection,
      selectedTemporalAggregation,
      setTemporalAggregationSelection,
      selectedTemporalResolution,
      setTemporalResolutionSelection,
      selectedTimestamp,
      setSelectedTimestamp,
      initialSelectedQualifierValues,
      initialNonDefaultQualifiers,
      initialSelectedYears,
      initialSelectedGlobalTimestamp,
      initialSelectedOutputVariables,
      initialActiveFeatures,
      initialActiveReferenceOptions,
      selectedDataLayerTransparency,
      setDataLayerTransparency,
      selectedDataLayer,
      setDataLayer,
      isRawDataLayerSelected,
      qualifierBreakdownData,
      toggleIsQualifierSelected,
      selectedQualifierValues,
      requestAdditionalQualifier,
      nonDefaultQualifiers,
      qualifierFetchInfo,
      selectedTransform,
      setTransformSelection,
      showPercentChange,
      activeReferenceOptions,
      toggleReferenceOptions,
      availableReferenceOptions,
      timeseriesData,
      visibleTimeseriesData,
      relativeTo,
      baselineMetadata,
      setRelativeTo,
      temporalBreakdownData,
      selectedYears,
      toggleIsYearSelected,
      outputs,
      selectedFeatures,
      selectedFeatureNames,
      toggleIsFeatureSelected,
      activeFeatures,
      globalTimeseries,
      selectedGlobalTimestamp,
      selectedGlobalTimestampRange,
      setSelectedGlobalTimestamp,
      setSelectedGlobalTimestampRange,
      timestampForSelection,
      selectedTimeseriesPoints,
      outputSpecs,
      regionalData,
      rawDataPointsList,
      onSyncMapBounds,
      mapBounds,
      colorSchemeReversed,
      setColorSchemeReversed,
      selectedColorSchemeName,
      setColorSchemeName,
      selectedColorScaleType,
      setColorScaleType,
      numberOfColorBins,
      setNumberOfColorBins,
      finalColorScheme,
      isContinuousScale,
      isDivergingScale,
      mapColorOptions,
      updateMapCurSyncedZoom,
      recalculateGridMapDiffStats,
      adminLayerStats,
      gridLayerStats,
      pointsLayerStats,
      mapLegendData
    } = useDatacube(
      metadata,
      itemId,
      activeFeatureName,
      isPeriodicallyRefreshingModelRuns
    );

    const toaster = useToaster();

    const isBreakdownPaneOpen = ref<boolean>(true);
    const activeVizOptionsTab = ref<string|null>(null);

    const potentialScenarios = ref<ScenarioData[]>([]);
    watch([newRunsMode], () => {
      potentialScenarios.value = [];
    });
    const potentialScenarioCount = computed(
      () => potentialScenarios.value.length
    );

    const showDatasets = ref<boolean>(false);
    const isRelativeDropdownOpen = ref<boolean>(false);
    const showGeoSelectionModal = ref<boolean>(false);
    const geoModelParam = ref<ModelParameter | null>(null);
    const showNewRunsModal = ref<boolean>(false);
    const showModelRunsExecutionStatus = ref<boolean>(false);
    const mapReady = ref<boolean>(false);

    const selectedBaseLayer = ref(BASE_LAYER.DEFAULT);
    const setBaseLayer = (val: BASE_LAYER) => {
      selectedBaseLayer.value = val;
    };

    const showTagNameModal = ref<boolean>(false);
    const showRunNameModal = ref<boolean>(false);
    const showScenarioTagsModal = ref<boolean>(false);

    const datePickerElement = ref<HTMLElement | null>(null);
    const dateParamPickerValue = ref<any | null>(null);

    const runFromInsight = ref<boolean>(false); // do we have a run from loaded insight?

    // FIXME: we only support one date param of each model datacube
    const dateModelParam = computed(() => {
      const modelMetadata = metadata.value;
      if (modelMetadata === null || !isModel(modelMetadata)) return null;
      const dateParams = modelMetadata.parameters.filter(dim => dim.type === DatacubeGenericAttributeVariableType.DateRange || dim.type === DatacubeGenericAttributeVariableType.Date);
      return dateParams.length > 0 ? dateParams[0] : null;
    });


    const updateAndFetch = async (newDefaultRun: ModelRun) => {
      const defaultRunModified = { ...newDefaultRun, is_default_run: true };
      await updateModelRun(defaultRunModified);
      fetchModelRuns();
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
    } = useParallelCoordinatesData(metadata, filteredRunData, selectedSpatialAggregation, selectedTemporalAggregation, itemId);

    const scenarioCount = computed(() => runParameterValues.value.length);

    const runningDefaultRun = computed(() => allModelRunData.value.some(run => run.is_default_run && (run.status === ModelRunStatus.Processing || run.status === ModelRunStatus.Submitted)));

    const runtimeStats = computed(() => {
      const runtimeMillis = allModelRunData.value
        .filter(run => run.runtimes?.post_processing?.start_time)
        .map(run => run.runtimes.post_processing.end_time - run.runtimes.post_processing.start_time)
        .sort((a, b) => a - b);

      if (runtimeMillis.length === 0) {
        return undefined;
      }

      const min = runtimeMillis[0];
      const max = runtimeMillis[runtimeMillis.length - 1];
      const sum = runtimeMillis.reduce((a, b) => a + b, 0);
      const mean = sum / runtimeMillis.length;
      const q25 = d3.quantileSorted(runtimeMillis, 0.25);
      const q50 = d3.quantileSorted(runtimeMillis, 0.5);
      const q75 = d3.quantileSorted(runtimeMillis, 0.75);

      return { min, max, sum, mean, q25, q50, q75 } as BoxPlotStats;
    });

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

    const runTags = computed<RunsTag[]>(() => {
      const tags: RunsTag[] = [];
      if (filteredRunData.value.length === 0) {
        return tags;
      }
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
      return tags;
    });

    const renameRun = async (newName: string) => {
      // Rename can only be performed when one run is selected
      if (selectedScenarios.value.length !== 1) {
        return;
      }

      const run = selectedScenarios.value[0];
      run.name = newName;
      showRunNameModal.value = false;
      await updateModelRun({ id: run.id, name: newName });
    };

    const onMapLoad = () => {
      emit('on-map-load');
    };

    watch(
      () => temporalResolutionOptions.value,
      () => {
        if (temporalResolutionOptions.value !== null) {
        // ensure the initial selectedTemporalResolution is valid and respect the "temporalResolutionOptions"
        // Also, set the resolution selection
          if (temporalResolutionOptions.value.findIndex(option => option === selectedTemporalResolution.value) < 0) {
            if (temporalResolutionOptions.value.length > 0) {
              setTemporalResolutionSelection(temporalResolutionOptions.value[0]);
            }
          }
        }
      }
    );

    // apply initial view config for this datacube
    watch([initialViewConfig], () => {
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
        if (initialViewConfig.value.dataLayerTransparency !== undefined) {
          selectedDataLayerTransparency.value = initialViewConfig.value.dataLayerTransparency;
        }
        if (initialViewConfig.value.colorSchemeReversed !== undefined) {
          colorSchemeReversed.value = initialViewConfig.value.colorSchemeReversed;
        }
        if (initialViewConfig.value.colorSchemeName !== undefined) {
          selectedColorSchemeName.value = initialViewConfig.value.colorSchemeName;
        }
        if (validateColorScaleType(String(initialViewConfig.value.colorScaleType))) {
          selectedColorScaleType.value = initialViewConfig.value.colorScaleType as ColorScaleType;
        }
        if (initialViewConfig.value.numberOfColorBins !== undefined) {
          numberOfColorBins.value = initialViewConfig.value.numberOfColorBins;
        }
        // FIXME: although we have restored the color palette/scale/options,
        //  none of those will look applied since the final color list is only generated when the viz-option is opened
      }
    }, { immediate: true });

    // HACK: please delete this
    const clearRouteParam = () => {
      if (!selectedModelId.value) {
        return; // yo dawg, I heard you like hacks so I put a hack in your hack
      }

      // fix to avoid double history later
      // only set if the current route param includes insight_id
      if (route && route.query && route.query.insight_id) {
        router.push({
          query: {
            insight_id: undefined,
            datacube_id: selectedModelId.value
          }
        }).catch(() => {});
      }
    };

    // selectedScenarioIds
    // When switching to new runs mode, clear any selected scenarios and show
    //  the model desc page
    watchEffect(() => {
      if (newRunsMode.value) {
        setSelectedScenarioIds([]);
      }
    });
    const setSelectedScenarioIds = (newIds: string[]) => {
      if (_.isEqual(selectedScenarioIds.value, newIds)) return;
      selectedScenarioIds.value = newIds;
    };
    const setSelectedScenarios = (e: { scenarios: Array<ScenarioData> }) => {
      const selectedScenarios = e.scenarios.filter(s => s.status === ModelRunStatus.Ready);
      setSelectedScenarioIds(selectedScenarios.map(s => s.run_id.toString()));
    };
    watch([selectedScenarioIds], clearRouteParam);

    const currentTabView = ref<DatacubeViewMode>(DatacubeViewMode.Description);
    // Switch to the data tab if the analyst selects one or more runs when the
    //  description tab is open. Switch to the description tab when the analyst
    //  deselects all runs.
    watchEffect(() => {
      if (!isModel(metadata.value)) {
        return;
      }
      if (selectedScenarioIds.value.length > 0) {
        if (
          currentTabView.value === DatacubeViewMode.Description &&
          canClickDataTab.value
        ) {
          currentTabView.value = DatacubeViewMode.Data;
        }
      } else {
        currentTabView.value = DatacubeViewMode.Description;
      }
    });

    const onTabClick = (value: DatacubeViewMode) => {
      if (value === DatacubeViewMode.Description) {
        if (isIndicator(metadata.value)) {
          currentTabView.value = DatacubeViewMode.Description;
        } else {
          setSelectedScenarioIds([]); // this will update the 'currentTabView'
        }
      } else if (value === DatacubeViewMode.Media) {
        currentTabView.value = DatacubeViewMode.Media;
      } else {
        clickData();
      }
    };

    watch(
      () => [tabState.value],
      () => {
        if (tabState.value as string !== '') {
          onTabClick(tabState.value as DatacubeViewMode);
        }
      },
      { immediate: true }
    );

    const clickData = () => {
      if (!canClickDataTab.value) {
        toaster(`At least one run must match the default parameters. Click "${defaultRunButtonCaption}"`, 'error', true);
        return;
      }
      // FIXME: This code to select a model run when switching to the data tab
      // should be in a watcher on the parent component to be more robust,
      // rather than in this button's click handler.

      if (isModel(metadata.value) && selectedScenarioIds.value.length === 0) {
        // clicking on either the 'data' or 'media' tabs when no runs is selected should always pick the baseline run
        const readyRuns = filteredRunData.value.filter(r => r.status === ModelRunStatus.Ready && r.is_default_run);
        if (readyRuns.length === 0) {
          console.warn('cannot find a baseline model run indicated by the is_default_run');
          // failed to find baseline using the 'is_default_run' flag
          // FIXME: so, try to find a model run that has values matching the default values of all inputs
        }
        const newIds = readyRuns.map(run => run.id).slice(0, 1);
        setSelectedScenarioIds(newIds);
      }

      currentTabView.value = DatacubeViewMode.Data;
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
      // since the data used to initialize the lex bar has changed,
      //  we may need to reset filters
      if (!_.isEmpty(modelRunsSearchData.value) && Object.keys(modelRunsSearchData.value).length > 1 && dimensions.value.length > 0) {
        const outputDim = dimensions.value[dimensions.value.length - 1];
        if (modelRunsSearchData.value[outputDim.name] === undefined) {
          modelRunSearchFilters.value = { clauses: [] };
        }
      }
      modelRunsSearchData.value = result;
    });

    watchEffect(() => {
      if (runTags.value) {
        modelRunsSearchData.value[TAGS].values = runTags.value.map(tagInfo => tagInfo.label);
      }
    });

    watch(
      () => initialDataConfig.value,
      () => {
        if (initialDataConfig.value && !_.isEmpty(initialDataConfig.value)) {
          if (initialDataConfig.value.selectedScenarioIds !== undefined) {
            runFromInsight.value = true;
            setSelectedScenarioIds(_.clone(initialDataConfig.value.selectedScenarioIds));
          }
          if (initialDataConfig.value.selectedTimestamp !== undefined) {
            if (initialViewConfig.value.breakdownOption && initialViewConfig.value.breakdownOption === SPLIT_BY_VARIABLE) {
              initialSelectedGlobalTimestamp.value = initialDataConfig.value.selectedTimestamp;
            } else {
              // setSelectedTimestamp(initialDataConfig.value.selectedTimestamp); // fyi: this cannot be called since it is defined later in the document
              selectedTimestamp.value = initialDataConfig.value.selectedTimestamp;
            }
          }
          if (initialDataConfig.value.selectedRegionIdsAtAllLevels !== undefined) {
            const regions = fromStateSelectedRegionsAtAllLevels(initialDataConfig.value.selectedRegionIdsAtAllLevels);
            const { validRegions } = validateSelectedRegions(regions, datacubeHierarchy.value);
            selectedRegionIdsAtAllLevels.value = validRegions;
          }
          if (initialDataConfig.value.selectedOutputVariables !== undefined) {
            initialSelectedOutputVariables.value = _.clone(initialDataConfig.value.selectedOutputVariables);
          }
          if (initialDataConfig.value.activeFeatures !== undefined) {
            initialActiveFeatures.value = _.clone(initialDataConfig.value.activeFeatures);
          }
          if (initialDataConfig.value.selectedYears !== undefined) {
            initialSelectedYears.value = _.clone(initialDataConfig.value.selectedYears);
          }
          if (initialDataConfig.value.selectedTransform !== undefined) {
            selectedTransform.value = initialDataConfig.value.selectedTransform as DataTransform;
          }
          if (initialDataConfig.value.activeReferenceOptions !== undefined) {
            initialActiveReferenceOptions.value = _.clone(initialDataConfig.value.activeReferenceOptions);
          }
          // Don't restore non-default qualifiers from an analysis since there is no way to reset the list
          // if (initialDataConfig.value.nonDefaultQualifiers !== undefined) {
          //   initialNonDefaultQualifiers.value = _.clone(initialDataConfig.value.nonDefaultQualifiers);
          // }
          if (initialDataConfig.value.selectedQualifierValues !== undefined) {
            initialSelectedQualifierValues.value = _.clone(initialDataConfig.value.selectedQualifierValues);
          }
          modelRunSearchFilters.value = _.clone(initialDataConfig.value.searchFilters);
        }
      },
      { immediate: true }
    );


    const requestNewModelRuns = () => {
      showNewRunsModal.value = true;
    };

    const showModelExecutionStatus = () => {
      showModelRunsExecutionStatus.value = true;
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

    const onNewScenarioRunsModalClose = (status: any) => {
      showNewRunsModal.value = false;
      if (status.cancel === false) {
        // execution has just started for some new runs so start the hot-reload cycle
        // first, exit new-runs-mode
        toggleNewRunsMode();
        // then, re-fetch data from server (wait some time to give the server a chance to update)
        _.delay(() => {
          if (isModel(metadata.value)) {
            fetchModelRuns();
          }
        }, 2000);
      }
    };

    const headerGroupButtons = computed(() => {
      const hasPreGenData = _.some(
        filteredRunData.value,
        run =>
          run.pre_gen_output_paths &&
          _.some(run.pre_gen_output_paths, p => p.coords === undefined)
      );
      const shouldShowMediaTab = !isIndicator(metadata.value) && hasPreGenData;
      const tabs = shouldShowMediaTab
        ? Object.values(DatacubeViewMode)
        : Object.values(DatacubeViewMode).filter(
          value => value !== DatacubeViewMode.Media
        );
      return tabs.map(tab => ({
        label: capitalize(tab),
        value: tab
      }));
    });

    // A map of all pre-generated data indexed by run-id
    const preGenDataMap = computed<{[runId: string]: PreGeneratedModelRunData[]}>(() => {
      if (filteredRunData.value.length === 0) {
        return {};
      }
      return Object.assign({}, ...filteredRunData.value.map((r) => ({ [r.id]: r.pre_gen_output_paths })));
    });
    // A list of unique pre-generated ids across all runs
    const preGenDataIds = computed<string[]>(() => {
      if (Object.keys(preGenDataMap.value).length === 0) {
        return [];
      }
      // note that some runs may not have valid pre-gen data (i.e., null)
      const allPreGenData = Object.values(preGenDataMap.value)
        .flat()
        .filter(p => p !== null && p !== undefined);
      // assign each pre-gen data item (within each run) an id
      allPreGenData.forEach(pregen => {
        pregen.id = getPreGenItemDisplayName(pregen);
      });
      // utilized to access the caption, as well as the id for the dropdown
      return _.uniq(allPreGenData.map(pregen => pregen.id as string));
    });

    const selectedPreGenDataId = ref('');
    // Reset the selected item if it no longer exists in the list
    watchEffect(() => {
      if (
        preGenDataIds.value.length > 0 &&
        !preGenDataIds.value.includes(selectedPreGenDataId.value)
      ) {
        selectedPreGenDataId.value = preGenDataIds.value[0];
      }
    });

    function getPreGenItemDisplayName(pregen: PreGeneratedModelRunData) {
      // @REVIEW: use the resource file name
      const lastSlashIndx = pregen.file.lastIndexOf('/');
      return pregen.file.substring(lastSlashIndx + 1);
    }

    function getSelectedPreGenOutput(runId: string): PreGeneratedModelRunData | undefined {
      return preGenDataMap.value[runId] ? preGenDataMap.value[runId].find(pregen => getPreGenItemDisplayName(pregen) === selectedPreGenDataId.value) : undefined;
    }

    const firstSelectedPreGenOutput = computed(() => {
      if (selectedScenarioIds.value.length < 1) {
        return undefined;
      }
      return getSelectedPreGenOutput(selectedScenarioIds.value[0]);
    });

    async function fetchImageData(preGenDataItem?: PreGeneratedModelRunData) {
      if (preGenDataItem?.file && preGenDataItem?.type === 'image' && !preGenDataItem?.embeddedSrc) {
        const url = preGenDataItem.file;
        const b64Str = await fetchImageAsBase64(url);
        preGenDataItem.embeddedSrc = b64Str;
      }
    }

    watch([selectedPreGenDataId, selectedScenarioIds],
      async () => {
        const promises = selectedScenarioIds.value.map(runId => {
          const preGenOutput = getSelectedPreGenOutput(runId);
          return fetchImageData(preGenOutput);
        });
        await Promise.all(promises);
      },
      {
        immediate: true
      }
    );

    const dataPaths = computed((): string[] => {
      if (!_.isNull(metadata.value)) {
        const isAModel: boolean = isModel(metadata.value);
        return _.compact(isAModel
          ? filteredRunData.value
            .filter(modelRun => selectedScenarioIds.value.indexOf(modelRun.id) >= 0)
            .flatMap(modelRun => modelRun.data_paths)
          : isIndicator(metadata.value) ? metadata.value.data_paths : []
        );
      } else {
        return [];
      }
    });

    const savePreGenAsInsight = async() => {
      const url = firstSelectedPreGenOutput.value?.file;
      await store.dispatch('insightPanel/setSnapshotUrl', url);
      await store.dispatch('insightPanel/showInsightPanel');
      await store.dispatch('insightPanel/setUpdatedInsight', null);
      await store.dispatch('insightPanel/setCurrentPane', 'review-new-insight');
    };

    const someVizOptionsInvalid = computed(() =>
      isPublishing.value && (selectedSpatialAggregation.value === AggregationOption.None ||
          selectedTemporalAggregation.value === AggregationOption.None ||
          selectedTemporalResolution.value === TemporalResolutionOption.None)
    );

    const updateGeneratedScenarios = (e: { scenarios: Array<ScenarioData> }) => {
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
            run[dateModelParam.value.name] = dateValue;
          }
        });
      }
    };

    const updateStateFromInsight = async (insight_id: string) => {
      const loadedInsight: Insight = await getInsightById(insight_id);
      // FIXME: before applying the insight, which will overwrite current state,
      //  consider pushing current state to the url to support browser history
      //  in case the user wants to navigate to the original state using back button
      // FIXME: the order of resetting the state is important
      if (loadedInsight) {
        const dataState = loadedInsight.data_state;
        if (dataState && isDataSpaceDataState(dataState)) {
          modelRunSearchFilters.value = _.clone(dataState.searchFilters);

          // this would only be valid and effective if/after datacube runs are reloaded
          setSelectedScenarioIds(dataState.selectedScenarioIds);

          if (dataState.selectedTimestamp !== null) {
            if (loadedInsight.view_state?.breakdownOption === SPLIT_BY_VARIABLE) {
              setSelectedGlobalTimestamp(dataState.selectedTimestamp);
            } else {
              setSelectedTimestamp(dataState.selectedTimestamp);
            }
          }

          if (dataState.relativeTo !== null) {
            setRelativeTo(dataState.relativeTo);
          }

          selectedTransform.value = dataState.selectedTransform;

          // this would only be valid and effective if/after datacube runs are reloaded
          selectedPreGenDataId.value = dataState.selectedPreGenDataId;
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
        if (loadedInsight.view_state?.selectedViewTab !== undefined) {
          currentTabView.value = loadedInsight.view_state?.selectedViewTab;
        }
        if (loadedInsight.view_state?.selectedOutputIndex !== undefined) {
          updateDatacubesOutputsMap(itemId.value, store, route, loadedInsight.view_state?.selectedOutputIndex);
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
        if (loadedInsight.view_state?.dataLayerTransparency !== undefined) {
          setDataLayerTransparency(loadedInsight.view_state?.dataLayerTransparency);
        }
        if (loadedInsight.view_state?.colorSchemeReversed !== undefined) {
          setColorSchemeReversed(loadedInsight.view_state?.colorSchemeReversed);
        }
        if (loadedInsight.view_state?.colorSchemeName !== undefined) {
          setColorSchemeName(loadedInsight.view_state?.colorSchemeName);
        }
        if (validateColorScaleType(String(loadedInsight.view_state?.colorScaleType))) {
          setColorScaleType(loadedInsight.view_state?.colorScaleType as ColorScaleType);
        }
        if (loadedInsight.view_state?.numberOfColorBins !== undefined) {
          setNumberOfColorBins(loadedInsight.view_state?.numberOfColorBins);
        }

        if (dataState && isDataSpaceDataState(dataState)) {
          initialNonDefaultQualifiers.value = _.clone(dataState.nonDefaultQualifiers);

          const regions = fromStateSelectedRegionsAtAllLevels(dataState.selectedRegionIdsAtAllLevels);
          const { validRegions } = validateSelectedRegions(regions, datacubeHierarchy.value);
          selectedRegionIdsAtAllLevels.value = validRegions;

          initialSelectedOutputVariables.value = _.clone(dataState.selectedOutputVariables);
          initialActiveFeatures.value = _.clone(dataState.activeFeatures);
          // @NOTE: 'initialSelectedQualifierValues' must be set after 'breakdownOption'
          initialSelectedQualifierValues.value = _.clone(dataState.selectedQualifierValues);
          // @NOTE: 'initialSelectedYears' must be set after 'breakdownOption'
          initialSelectedYears.value = _.clone(dataState.selectedYears);
          // @NOTE: 'initialActiveReferenceOptions' must be set after 'breakdownOption'
          initialActiveReferenceOptions.value = _.clone(dataState.activeReferenceOptions);
        }
      }
    };


    // A map from timeseries to matching datacube (name and feature). Since
    //  globalTimeseries is used when multiple features are selected, we need
    //  to create a new ID for each timeseries that includes the feature name.
    const timeseriesToDatacubeMap = ref<{[timeseriesId: string]: { datacubeName: string; datacubeOutputVariable: string }}>({});
    watch([selectedFeatures, globalTimeseries], () => {
      if (selectedFeatures.value.length !== globalTimeseries.value.length) {
        return;
      }
      const result: {[timeseriesId: string]: { datacubeName: string; datacubeOutputVariable: string }} = {};
      const features = selectedFeatures.value;
      globalTimeseries.value.forEach((timeseries, index) => {
        const feature = features[index];
        // Prevent duplicate appends.
        // FIXME: it's not clear why this is necessary. Duplicate appends
        //  would imply we're rerunning this code multiple times for the
        //  same globalTimeseries list, which is a bug.
        // Though this code is being called multiple times, globalTimeseries
        //  should be fresh each time, so no need to check for the potential
        //  duplication. If useMultiTimeseriesData guarantees that, this code
        //  can be removed.
        // FIXME: the id should be constructed when globalTimeseries is. Because
        //  we can have duplicates of the same datacube, the ID will need to be
        //  made from item_id (unique for each analysis item) + whichever is
        //  used to differentiate between timeseries for the current breakdown.
        if (!timeseries.id.endsWith(feature.name)) {
          // use a combination of timeseries id and feature name as the ultimate unique id
          // override the timeseries id to match its owner datacube
          timeseries.id = timeseries.id + feature.name;
        }
        result[timeseries.id] = {
          datacubeName: feature.name,
          datacubeOutputVariable: feature.display_name
        };
      });
      timeseriesToDatacubeMap.value = result;
    }, { immediate: true });

    const featureBreakdownData = computed<BreakdownData | null>(() => {
      // If metadata hasn't loaded, return null.
      if (outputs.value === null) return null;
      const breakdownData = {
        Variable: outputs.value.map(feature => ({
          id: feature.display_name,
          values: { [feature.name]: 0 }
        }))
      };
      // If we haven't fetched the timeseries for the selected features yet,
      //  return a BreakdownData object with values of 0 for each feature.
      if (selectedFeatures.value.length !== globalTimeseries.value.length) {
        return breakdownData;
      }
      const normalizedGlobalTimeseries = _.cloneDeep(globalTimeseries.value);
      // Append a normalizedValue property in the range 0 to 1 to each point.
      // FIXME: rather than modifiying the timeseries list in place,
      //  normalizeTimeseriesList should return a new list.
      normalizedGlobalTimeseries.forEach(
        timeseries => normalizeTimeseriesList([timeseries])
      );
      normalizedGlobalTimeseries.forEach(timeseries => {
        // If timeseries has a point at the globally selected timestamp and
        //  timeseries.name is one of the features' names, update that value in
        //  the breakdownData.
        const pointAtGlobalTimestamp = timeseries.points.find(
          point => point.timestamp === selectedGlobalTimestamp.value
        );
        breakdownData.Variable.forEach(feature => {
          if (
            pointAtGlobalTimestamp !== undefined &&
            timeseries.name in feature.values
          ) {
            // FIXME: We don't even use the normalized value to calculate
            //  featureBreakdownData. Seems like we should either
            //  a) use the normalized value here?
            //  b) perform the normalization  right when calculating
            //      globalTimeseries
            //  c) replace value with normalizedValue if that's what should be
            //      displayed everywhere in the current state
            //  d) all of the above
            feature.values[timeseries.name] = pointAtGlobalTimestamp.value;
          }
        });
      });
      return breakdownData;
    });

    // FIXME: This is used in datacube-card, comparative-card, and
    //  comparative-overlay-region. There is a longer modified version in
    //  region-ranking card. datacube-card runs this once for each output
    //  variable. If we can unify these behaviours this whole thing can be moved into useDatacube.
    // FIXME: Investigate why BarData is being used to populate the map. If we
    //  can use regionalData directly, we can remove this second piece of
    //  state with its confusing and similar name.
    const regionMapData = computed(() => {
      const result: {[variableName: string]: BarData[]} = {};
      if (breakdownOption.value !== SPLIT_BY_VARIABLE || regionalData.value === null) {
        return result;
      }
      const selectedRegionalData = getActiveRegions(regionalData.value, selectedRegionIdsAtAllLevels.value);
      selectedFeatures.value.forEach(({ name: selectedFeature }) => {
        result[selectedFeature] = convertRegionalDataToBarData(
          selectedRegionalData,
          selectedAdminLevel.value,
          selectedFeature,
          numberOfColorBins.value,
          finalColorScheme.value,
          selectedDataLayerTransparency.value
        );
      });
      return result;
    });

    const unit = computed(() => {
      const transform = isRawDataLayerSelected.value ? DataTransform.None : selectedTransform.value;
      return getUnitString(activeFeature.value?.unit || null, transform);
    });

    const timeseriesUnit = computed(() => {
      if (relativeTo.value && showPercentChange.value) {
        return '%';
      }
      const activeFeatureUnit = activeFeature.value?.unit;
      if (breakdownOption.value === null ||
        breakdownOption.value === TemporalAggregationLevel.Year ||
        selectedTransform.value === DataTransform.Normalization
      ) {
        return activeFeatureUnit ?? '';
      }
      // If split by region or split by qualifier with regions selected
      if (breakdownOption.value === SpatialAggregationLevel.Region || selectedRegionIds.value.length > 0) {
        return getUnitString(activeFeatureUnit ?? null, selectedTransform.value);
      }
      return activeFeatureUnit ?? '';
    });

    const mapSelectedLayerId = computed(() => {
      return getMapSourceLayer(selectedDataLayer.value, selectedAdminLevel.value).layerId;
    });

    const isSplitByRegionMode = computed(() => breakdownOption.value === SpatialAggregationLevel.Region);
    const mapBoundsForEachSpec = ref<{ [key: string]: number[][]}>({});
    watchEffect(async () => {
      // init result
      const result: { [key: string]: number[][] } = {};
      const ids = outputSpecs.value.map(spec => spec.id);
      ids.forEach(id => {
        result[id] = _.isArray(mapBounds.value) ? mapBounds.value : mapBounds.value.value;
      });

      if (isSplitByRegionMode.value) {
        // In this case, ids are region ids
        const bboxes = await getBboxForEachRegionId(ids);
        ids.forEach((regionId, index) => {
          const bbox = bboxes[index];
          if (bbox) result[regionId] = bbox;
        });
      }

      mapBoundsForEachSpec.value = result;
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
        selectedDataLayerTransparency,
        colorSchemeReversed,
        selectedColorSchemeName,
        selectedColorScaleType,
        numberOfColorBins
      );
      store.dispatch('insightPanel/setViewState', viewState);
    });

    watchEffect(() => {
      emit('visible-timeseries-changed', visibleTimeseriesData.value);
    });


    watchEffect(() => {
      const dataState: DataSpaceDataState = initDataStateFromRefs(
        relativeTo,
        selectedModelId,
        nonDefaultQualifiers,
        selectedQualifierValues,
        selectedRegionIds,
        selectedRegionIdsAtAllLevels,
        selectedFeatureNames,
        activeFeatures,
        selectedScenarioIds,
        timestampForSelection,
        selectedYears,
        selectedTransform,
        activeReferenceOptions,
        modelRunSearchFilters,
        selectedPreGenDataId
      );

      store.dispatch('insightPanel/setDataState', dataState);
    });

    const mapSelectedRegions = computed(() => {
      // In 'Split by region' mode, regional data is already filtered by region so we don't need additional region selection
      return breakdownOption.value === SpatialAggregationLevel.Region
        ? undefined
        : selectedRegionIdsAtAllLevels.value;
    });

    const filteredAggregationOptions = computed(() => {
      const hasWeight = getWeightQualifier(metadata.value?.qualifier_outputs);
      return aggregationOptions.value?.filter(agg => agg !== AggregationOption.WeightedAverage || hasWeight);
    });

    return {
      addNewTag,
      renameRun,
      allModelRunData,
      isBreakdownPaneOpen,
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
      fetchModelRuns,
      filteredRunData,
      geoModelParam,
      savePreGenAsInsight,
      getSelectedPreGenOutput,
      gridLayerStats,
      hasDefaultRun,
      headerGroupButtons,
      isContinuousScale,
      isDivergingScale,
      isModel,
      isRelativeDropdownOpen,
      isSplitByRegionMode,
      mapBounds,
      mapBoundsForEachSpec,
      mapColorOptions,
      mapLegendData,
      mapReady,
      mapSelectedLayerId,
      mapSelectedRegions,
      modelRunsSearchData,
      newRunsMode,
      onMapLoad,
      onNewScenarioRunsModalClose,
      onSyncMapBounds,
      onTabClick,
      setSelectedScenarioIds,
      outputSpecs,
      pointsLayerStats,
      potentialScenarios,
      potentialScenarioCount,
      projectType,
      preGenDataIds,
      qualifierBreakdownData,
      rawDataPointsList,
      activeFeature,
      featureBreakdownData,
      recalculateGridMapDiffStats,
      regionalData,
      relativeTo,
      requestNewModelRuns,
      runningDefaultRun,
      runtimeStats,
      runParameterValues,
      qualifierFetchInfo,
      scenarioCount,
      modelRunSearchFilters,
      selectedAdminLevel,
      selectedBaseLayer,
      selectedDataLayerTransparency,
      finalColorScheme,
      setColorSchemeReversed,
      colorSchemeReversed,
      setColorSchemeName,
      selectedColorSchemeName,
      setColorScaleType,
      selectedColorScaleType,
      setNumberOfColorBins,
      numberOfColorBins,
      availableReferenceOptions,
      selectedDataLayer,
      firstSelectedPreGenOutput,
      selectedPreGenDataId,
      selectedQualifierValues,
      selectedRegionIds,
      selectedRegionIdsAtAllLevels,
      referenceRegions,
      selectedScenarioIds,
      selectedScenarios,
      selectedSpatialAggregation,
      selectedTemporalAggregation,
      selectedTemporalResolution,
      selectedTimeseriesPoints,
      selectedTimestamp,
      selectedYears,
      selectedFeatures,
      selectedFeatureNames,
      setSelectedAdminLevel,
      setBreakdownOption,
      setBaseLayer,
      setDataLayer,
      setDataLayerTransparency,
      setRelativeTo,
      setSelectedTimestamp,
      setSpatialAggregationSelection,
      setTemporalAggregationSelection,
      setTemporalResolutionSelection,
      setTransformSelection,
      selectedTransform,
      requestAdditionalQualifier,
      showDatasets,
      showGeoSelectionModal,
      showModelExecutionStatus,
      showModelRunsExecutionStatus,
      showScenarioTagsModal,
      showNewRunsModal,
      showTagNameModal,
      showRunNameModal,
      SpatialAggregationLevel,
      TemporalAggregationLevel,
      temporalBreakdownData,
      timeseriesData,
      toaster,
      toggleIsQualifierSelected,
      toggleIsRegionSelected,
      toggleIsYearSelected,
      toggleIsFeatureSelected,
      toggleNewRunsMode,
      toggleReferenceOptions,
      unit,
      timeseriesUnit,
      updatePotentialScenarioDates,
      updateStateFromInsight,
      updateGeneratedScenarios,
      updateMapCurSyncedZoom,
      setSelectedScenarios,
      visibleTimeseriesData,
      showPercentChange,
      someVizOptionsInvalid,
      globalTimeseries,
      selectedGlobalTimestamp,
      selectedGlobalTimestampRange,
      timeseriesToDatacubeMap,
      setSelectedGlobalTimestampRange,
      setSelectedGlobalTimestamp,
      SPLIT_BY_VARIABLE,
      regionMapData,
      popupFormatter: (feature: any) => popupFormatter(feature, true),
      DatacubeViewMode,
      DatacubeStatus,
      itemId,
      filteredAggregationOptions
    };
  },
  watch: {
    $route: {
      handler(/* newValue, oldValue */) {
        // NOTE:  this is only valid when the route is focused on the 'data' or 'modelPublisher' spaces
        if ((this.$route.name === 'data' || this.$route.name === 'modelPublisher') && this.$route.query) {
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
    getSelectedLayer(id: string): string {
      const layerId = this.isReferenceSeries(id) && this.breakdownOption === SpatialAggregationLevel.Region && this.selectedDataLayer === DATA_LAYER.ADMIN
        ? SOURCE_LAYERS[0].layerId
        : this.mapSelectedLayerId;
      return layerId;
    },
    isReferenceSeries(id: string): boolean {
      return this.availableReferenceOptions.filter((item) => item.id === id).length > 0;
    },
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

          const getFormattedBBox = (bbox: any) => {
            // NOTE: bbox is coming as input string formatted as
            //       [ [{left}, {top}], [{right}, {bottom}] ]
            const targetBBoxFormat = updatedModelParam.additional_options.geo_bbox_format;
            if (!targetBBoxFormat) {
              return bbox; // user has not defined a bbox format, so return the default one
            }
            let finalBBox = _.clone(targetBBoxFormat);
            finalBBox = finalBBox.replace('{left}', bbox[0][0]);
            finalBBox = finalBBox.replace('{top}', bbox[0][1]);
            finalBBox = finalBBox.replace('{right}', bbox[1][0]);
            finalBBox = finalBBox.replace('{bottom}', bbox[1][1]);
            return finalBBox;
          };
          const getFormattedCode = (code: string) => {
            if (updatedModelParam.additional_options.geo_omit_gadm_code_version) {
              if (code.indexOf('_') > -1) {
                return code.substring(0, code.lastIndexOf('_'));
              }
              return code;
            } else {
              return code;
            }
          };
          const formattedRegion = (region: GeoRegionDetail) => {
            const validSelectedRegion = region.path;
            switch (updatedModelParam.additional_options.geo_region_format) {
              case undefined: // undefined preference for region format -> fall back to full region path
              case GeoAttributeFormat.Full_GADM_PATH:
                return validSelectedRegion;
              case GeoAttributeFormat.GADM_Code:
                return getFormattedCode(region.code);
              case GeoAttributeFormat.Bounding_Box:
                return getFormattedBBox(region.bbox);
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
        this.fetchModelRuns();
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
        const response = createModelRun(modelRun.model_id, modelRun.model_name, modelRun.parameters, modelRun.is_default_run);
        response
          .then((res: any) => {
            if (res.data && res.data.run_id && res.data.run_id.length > 0) {
              this.toaster('Retrying model run\nPlease check back later!', 'success');
            } else {
              this.toaster('Some issue occured while retrying model run!', 'error');
            }
          })
          .catch((error) => {
            console.warn(error);
            this.toaster('Some issue occured while retrying model run!', 'error');
          });
      }
      await this.deleteWithRun(modelRun);
    },
    // TODO: Refactor this to use the function for creating model runs.
    async createRunWithDefaults() {
      // send the request to the server
      const metadata = this.metadata;
      try {
        if (isModel(metadata)) {
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

.viz-option-invalid {
  border-color: red;
  border-style: solid;
  &:hover {
    border-color: red;
    border-style: solid;
  }
}

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
}

.card-map-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;

  :deep(.wm-map) {
    border-style: solid;
    border-color: inherit;
  }
  &.is-default-run {
    :deep(.wm-map) {
      border-width: 8px;
    }
  }
  &.card-count-1 {
    :deep(.wm-map) {
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
