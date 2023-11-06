<template>
  <div class="model-drilldown-container">
    <!-- TODO: insights -->
    <div class="config-column">
      <header>
        <h3>{{ metadata?.name }}</h3>
        <div
          class="model-details"
          :class="{ expanded: isModelDetailsSectionExpanded }"
          @click="isModelDetailsSectionExpanded = !isModelDetailsSectionExpanded"
        >
          <p class="subdued un-font-small">
            {{ metadata?.description ?? '...' }}
          </p>
          <p
            v-if="isModelDetailsSectionExpanded && metadata !== null"
            class="subdued un-font-small"
          >
            Source: {{ metadata.maintainer.organization }} (<a
              v-if="stringUtil.isValidUrl(metadata.maintainer.website)"
              :href="metadata.maintainer.website"
              target="_blank"
              rel="noopener noreferrer"
              @click.stop
            >
              {{ metadata.maintainer.website }} </a
            >)
          </p>
          <p
            v-if="isModelDetailsSectionExpanded && metadata !== null"
            class="subdued un-font-small"
          >
            Registered by: {{ metadata.maintainer.name }} ({{ metadata.maintainer.email }})
          </p>
          <span class="expand-collapse-controls subdued un-font-small">
            <i
              class="fa"
              :class="[isModelDetailsSectionExpanded ? 'fa-angle-up' : 'fa-angle-down']"
            />
            {{ isModelDetailsSectionExpanded ? 'Show less' : 'Show more' }}</span
          >
        </div>
      </header>
      <section v-if="metadata !== null" class="model-run-parameters-section">
        <div class="section-header">
          <h4>Model run parameters</h4>
          <button @click="isSelectModelRunsModalOpen = true" class="btn btn-default">
            Select model runs
          </button>
        </div>

        <model-run-summary-list :metadata="metadata" :model-runs="selectedModelRuns" />
      </section>
      <section>
        <h4>Displayed output</h4>

        <div class="output-variables">
          <div class="output-variable">
            <p>{{ activeOutputVariable?.display_name ?? '...' }}</p>
            <span class="subdued un-font-small">{{
              activeOutputVariable?.description ?? '...'
            }}</span>
          </div>
          <p><span class="subdued">Unit:</span> {{ activeOutputVariable?.unit }}</p>
        </div>

        <div class="labelled-dropdowns">
          <div class="labelled-dropdown">
            <p class="subdued">Aggregated by</p>
            <button class="btn btn-default">sum</button>
          </div>

          <div class="labelled-dropdown">
            <p class="subdued">Temporal resolution</p>
            <button class="btn btn-default">monthly</button>
          </div>

          <div class="labelled-dropdown">
            <p class="subdued">Spatial resolution</p>
            <button class="btn btn-default">country</button>
          </div>
        </div>

        <button @click="isFilterAndCompareModalOpen = true" class="btn btn-default">
          Filter and compare
        </button>

        <div class="media-files">
          <span class="subdued un-font-small">This model produces media files.</span>
          <button class="btn btn-default">View supporting media</button>
        </div>
      </section>
    </div>
    <div class="visualization-container">
      <div class="date-selector">
        <timeseries-chart
          v-if="timeseriesData.length > 0 && selectedTimestamp !== null"
          class="timeseries-chart"
          :timeseries-data="timeseriesData"
          :selected-timestamp="selectedTimestamp"
          :breakdown-option="null"
          :selected-temporal-resolution="TemporalResolutionOption.Month"
          :unit="''"
          @select-timestamp="setSelectedTimestamp"
        />
        <p class="selected-date"><span class="subdued">Selected date:</span> December 2012</p>
      </div>
      <div class="date-dependent-data">
        <div class="maps">
          <!-- TODO: breakdown state outputs -->
          <!-- <div class="card-maps-box" v-if="breakdownState !== null && isBreakdownStateOutputs(breakdownState)">
            <div
              v-for="({ name: featureName }, indx) in selectedFeatures"
              :key="featureName"
              class="card-map-container"
              :class="[`card-count-${selectedFeatures.length < 5 ? selectedFeatures.length : 'n'}`]"
            >
              <span v-if="selectedFeatures.length > 1" :style="{ color: colorFromIndex(indx) }">
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
          </div> -->
          <!-- TODO: v else if -->
          <!-- <div class="card-maps-box" v-else-if="breakdownState !== null && regionalData !== null"> -->
          <div class="card-maps-box" v-if="breakdownState !== null && regionalData !== null">
            <div
              v-for="spec in outputSpecs"
              :key="spec.id"
              class="card-map-container"
              :class="[`card-count-${outputSpecs.length < 5 ? outputSpecs.length : 'n'}`]"
            >
              <!-- TODO: timeseries name and border colour -->
              <!-- <span v-if="outputSpecs.length > 1" :style="{ color: colorFromIndex(indx) }">
              {{ selectedTimeseriesPoints[indx]?.timeseriesName ?? '--' }}
            </span> -->
              <!-- :style="{ borderColor: colorFromIndex(indx) }" -->
              <!-- :selected-layer-id="getSelectedLayer(spec.id)" -->
              <analysis-map
                class="card-map"
                :output-source-specs="outputSpecs"
                :output-selection="spec.id"
                :relative-to="
                  breakdownState.comparisonSettings.shouldDisplayAbsoluteValues === false
                    ? breakdownState.comparisonSettings.baselineTimeseriesId
                    : undefined
                "
                :show-tooltip="true"
                :selected-layer-id="getSelectedLayer()"
                :map-bounds="mapBounds"
                :region-data="regionalData"
                :raw-data="[]"
                :selected-regions="mapSelectedRegions"
                :admin-layer-stats="adminLayerStats"
                :grid-layer-stats="gridLayerStats"
                :points-layer-stats="pointsLayerStats"
                :selected-base-layer="selectedBaseLayer"
                :unit="''"
                :color-options="mapColorOptions"
                :show-percent-change="breakdownState.comparisonSettings.shouldUseRelativePercentage"
              />
              <!-- :map-bounds="isSplitByRegionMode ? mapBoundsForEachSpec[spec.id] : mapBounds" -->
              <!-- :unit="unit" -->
              <!-- raw data="rawDataPointsList[indx]"" -->
              <!-- @sync-bounds="
                  (bounds) => (isSplitByRegionMode ? () => {} : onSyncMapBounds(bounds))
                "
                @on-map-load="onMapLoad"
                @zoom-change="updateMapCurSyncedZoom"
                @map-update="recalculateGridMapDiffStats" -->
            </div>
          </div>
          <button class="btn btn-default"><i class="fa fa-fw fa-gear" />Map options</button>
        </div>
        <div class="breakdown-column">
          <!-- TODO: breakdown column-->
        </div>
      </div>
    </div>

    <modal-select-model-runs
      v-if="isSelectModelRunsModalOpen && metadata !== null && firstOutputName !== null"
      :metadata="metadata"
      :current-output-name="firstOutputName"
      :initial-selected-model-run-ids="selectedModelRunIds"
      @close="isSelectModelRunsModalOpen = false"
      @update-selected-model-runs="setSelectedModelRunIds"
    />

    <modal-filter-and-compare
      v-if="isFilterAndCompareModalOpen && metadata !== null && breakdownState !== null"
      :metadata="metadata"
      :spatial-aggregation="spatialAggregation"
      :initial-breakdown-state="breakdownState"
      @close="isFilterAndCompareModalOpen = false"
      @apply-breakdown-state="(newState) => (breakdownState = newState)"
      @set-spatial-aggregation="(newValue) => (spatialAggregation = newValue)"
    />
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import useModelMetadata from '@/composables/useModelMetadata';
import TimeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import { Ref, computed, ref, watch } from 'vue';
import {
  AggregationOption,
  DatacubeGeoAttributeVariableType,
  SpatialAggregation,
  TemporalResolutionOption,
} from '@/types/Enums';
import { BreakdownState, BreakdownStateNone, DatacubeFeature, Model } from '@/types/Datacube';
import {
  getFilteredScenariosFromIds,
  getOutput,
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  getFirstDefaultModelRun,
  isBreakdownStateRegions,
} from '@/utils/datacube-util';
import useScenarioData from '@/composables/useScenarioData';
import useTimeseriesDataFromBreakdownState from '@/composables/useTimeseriesDataFromBreakdownState';
import stringUtil from '@/utils/string-util';
import ModalSelectModelRuns from '@/components/modals/modal-select-model-runs.vue';
import ModelRunSummaryList from '@/components/model-drilldown/model-run-summary-list.vue';
import ModalFilterAndCompare from '@/components/modals/modal-filter-and-compare.vue';
import { getDefaultFeature } from '@/services/datacube-service';
import useToaster from '@/composables/useToaster';
import { TYPE } from 'vue-toastification';
import AnalysisMap from '@/components/data/analysis-map.vue';
import { BASE_LAYER, DATA_LAYER, SOURCE_LAYERS, getMapSourceLayer } from '@/utils/map-util-new';
import useMapBounds from '@/composables/useMapBounds';
import useRegionalDataFromBreakdownState from '@/composables/useRegionalDataFromBreakdownState';
import useOutputSpecsFromBreakdownState from '@/composables/useOutputSpecsFromBreakdownState';
import { stringToAdminLevel } from '@/utils/admin-level-util';
import useAnalysisMapStats from '@/composables/useAnalysisMapStats';
import useDatacubeColorScheme from '@/composables/useDatacubeColorScheme';
import { AdminRegionSets } from '@/types/Datacubes';

const breakdownState = ref<BreakdownState | null>(null);
const modelId = ref('2c461d67-35d9-4518-9974-30083a63bae5');
const metadata = useModelMetadata(modelId) as Ref<Model | null>;
const { filteredRunData } = useScenarioData(modelId, ref({ clauses: [] }), ref([]), ref(false));
watch([metadata, filteredRunData], () => {
  // When enough metadata has been fetched, initialize the breakdown state
  // TODO: load from default insight or applied insight or saved state.
  if (metadata.value === null || filteredRunData.value.length === 0) {
    return;
  }
  // If breakdown state is not null, it's already been initialized, so return.
  if (breakdownState.value !== null) {
    return;
  }
  const outputName = getDefaultFeature(metadata.value)?.name ?? null;
  const defaultModelRun = getFirstDefaultModelRun(filteredRunData.value);
  if (outputName === null || defaultModelRun === undefined) {
    return;
  }
  const initialBreakdownState: BreakdownStateNone = {
    outputName,
    modelRunIds: [defaultModelRun.id],
    comparisonSettings: {
      baselineTimeseriesId: defaultModelRun.id,
      shouldDisplayAbsoluteValues: true,
      shouldUseRelativePercentage: false,
    },
  };
  breakdownState.value = initialBreakdownState;
});

const isModelDetailsSectionExpanded = ref(false);

const firstOutputName = computed<string | null>(() => {
  if (metadata.value === null || breakdownState.value === null) return null;
  return isBreakdownStateOutputs(breakdownState.value)
    ? breakdownState.value.outputNames[0]
    : breakdownState.value.outputName;
});
// TODO: add support for multiple selected output variables
const activeOutputVariable = computed<DatacubeFeature | null>(() => {
  if (metadata.value === null || firstOutputName.value === null) {
    return null;
  }
  return getOutput(metadata.value, firstOutputName.value) ?? null;
});

const toast = useToaster();
const selectedModelRunIds = computed(() => {
  if (breakdownState.value === null) {
    return [];
  }
  return isBreakdownStateNone(breakdownState.value)
    ? breakdownState.value.modelRunIds
    : [breakdownState.value.modelRunId];
});
const setSelectedModelRunIds = (newRunIds: string[]) => {
  if (breakdownState.value === null) {
    return;
  }
  if (isBreakdownStateNone(breakdownState.value)) {
    breakdownState.value = {
      ...breakdownState.value,
      modelRunIds: [...newRunIds],
    };
    return;
  }
  if (newRunIds.length === 1) {
    breakdownState.value = {
      ...breakdownState.value,
      modelRunId: newRunIds[0],
    };
  }
  if (metadata.value === null) {
    return;
  }
  // Handle the case where the user has a breakdown state selected that doesn't support multiple
  //  model runs.
  toast(
    'Resetting "Filter and compare" configuration, since you selected multiple runs.',
    TYPE.INFO
  );
  const newBreakdownState: BreakdownStateNone = {
    outputName: isBreakdownStateOutputs(breakdownState.value)
      ? breakdownState.value.outputNames[0]
      : breakdownState.value.outputName,
    modelRunIds: newRunIds,
    comparisonSettings: {
      baselineTimeseriesId: newRunIds[0],
      shouldDisplayAbsoluteValues: true,
      shouldUseRelativePercentage: false,
    },
  };
  breakdownState.value = newBreakdownState;
};
const selectedModelRuns = computed(() =>
  getFilteredScenariosFromIds(selectedModelRunIds.value, filteredRunData.value)
);

const isSelectModelRunsModalOpen = ref(false);

const isFilterAndCompareModalOpen = ref(false);

const spatialAggregation = ref<SpatialAggregation>(DatacubeGeoAttributeVariableType.Country);
const spatialAggregationMethod = ref<AggregationOption>(AggregationOption.Mean);
const temporalResolution = ref(TemporalResolutionOption.Month);
const temporalAggregationMethod = ref<AggregationOption>(AggregationOption.Mean);

const { timeseriesData } = useTimeseriesDataFromBreakdownState(
  breakdownState,
  metadata,
  spatialAggregationMethod,
  temporalAggregationMethod,
  temporalResolution
);

const selectedTimestamp = ref<number | null>(null);
const setSelectedTimestamp = (newValue: number | null) => {
  selectedTimestamp.value = newValue;
};
// Whenever the timeseries data changes, ensure the selected timestamp is found within it.
watch(
  timeseriesData,
  () => {
    const allTimestamps = timeseriesData.value
      .map((timeseries) => timeseries.points)
      .flat()
      .map((point) => point.timestamp);
    if (selectedTimestamp.value !== null && allTimestamps.includes(selectedTimestamp.value)) {
      return;
    }
    const lastTimestamp = _.max(allTimestamps);
    if (lastTimestamp !== undefined) {
      setSelectedTimestamp(lastTimestamp);
    }
  },
  { immediate: true }
);

// const activeFeatures = computed<FeatureConfig[]>(() => {
//   // TODO: support multiple
//   if (activeOutputVariable.value === null) return [];
//   const config: FeatureConfig = {
//     name: activeOutputVariable.value.name,
//     display_name: activeOutputVariable.value.display_name,
//     temporalResolution: temporalResolution.value,
//     temporalAggregation: temporalAggregationMethod.value,
//     spatialAggregation: spatialAggregationMethod.value,
//     // TODO: transform?
//     transform: DataTransform.None,
//   };
//   return [config];
// });
// const activeFeatureName = computed(() => firstOutputName.value ?? '');
// const selectedTimeseriesPoints = computed<TimeseriesPointSelection[]>(() => {
//   if (selectedTimestamp.value === null) return [];
//   const test: TimeseriesPointSelection = {
//     timeseriesId: timeseriesData.value[0].id,
//     // scenarioId: string,
//     timestamp: selectedTimestamp.value,
//     isTimestampInTimeseries: true, // TODO:
//     timeseriesName: string,
//     color: string,
//   };
//   return [test];
// });
const { outputSpecs } = useOutputSpecsFromBreakdownState(
  breakdownState,
  metadata,
  spatialAggregationMethod,
  temporalAggregationMethod,
  temporalResolution,
  selectedTimestamp
);

const { regionalData } = useRegionalDataFromBreakdownState(
  breakdownState,
  metadata,
  outputSpecs,
  selectedTimestamp
);

const selectedRegionIds = computed<string[]>(() => {
  const state = breakdownState.value;
  if (state === null || isBreakdownStateNone(state) || isBreakdownStateOutputs(state)) return [];
  if (isBreakdownStateRegions(state)) return state.regionIds;
  return state.regionId ? [state.regionId] : [];
});
// TODO:
// const { onSyncMapBounds, mapBounds } = useMapBounds(regionalData, selectedRegionIds);
const { mapBounds } = useMapBounds(regionalData, selectedRegionIds);
// TODO: user-selected
const selectedBaseLayer = ref(BASE_LAYER.DEFAULT);
const selectedDataLayer = ref(DATA_LAYER.ADMIN);

const mapSelectedLayerId = computed(() => {
  const adminLevel =
    spatialAggregation.value === 'tiles' ? 0 : stringToAdminLevel(spatialAggregation.value);
  return getMapSourceLayer(selectedDataLayer.value, adminLevel).layerId;
});
// TODO:
// const getSelectedLayer = (id: string): string => {
const getSelectedLayer = (): string => {
  const isReferenceSeries = false;
  // TODO: reference series
  // const isReferenceSeries = this.availableReferenceOptions.filter((item) => item.id === id).length > 0;
  const layerId =
    isReferenceSeries &&
    breakdownState.value !== null &&
    isBreakdownStateRegions(breakdownState.value) &&
    selectedDataLayer.value === DATA_LAYER.ADMIN
      ? SOURCE_LAYERS[0].layerId
      : mapSelectedLayerId.value;
  return layerId;
};

const mapSelectedRegions = computed<AdminRegionSets>(() => {
  return {
    country: new Set(),
    admin1: new Set(),
    admin2: new Set(),
    admin3: new Set(),
  };
  // In 'Split by region' mode, regional data is already filtered by region so we don't need additional region selection
  // return breakdownState.value === null || isBreakdownStateRegions(breakdownState.value)
  //   ? undefined
  //   : selectedRegionIds.value;
  // TODO: check difference between regionids at all levels and selected level in datacube-card. When would they be different?
  // selectedRegionIds currently is only selected level
  // : selectedRegionIdsAtAllLevels.value;
});

const { mapColorOptions } = useDatacubeColorScheme();
const {
  // updateMapCurSyncedZoom,
  // recalculateGridMapDiffStats,
  adminLayerStats,
  gridLayerStats,
  pointsLayerStats,
  // mapLegendData,
} = useAnalysisMapStats(
  outputSpecs,
  regionalData,
  ref(null), // TODO: relativeTo,
  selectedDataLayer,
  ref(0), // TODO: selectedAdminLevel,
  mapSelectedRegions, // TODO:, selectedRegionIdsAtAllLevels,
  ref(false), // TODO: showPercentChange,
  mapColorOptions,
  ref([]), // TODO: activeReferenceOptions,
  ref(null), // TODO: breakdownOption,
  ref([]) // TODO: rawDataPointsList
);
</script>

<style lang="scss" scoped>
@import '@/styles/common';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/variables';

.model-drilldown-container {
  height: $content-full-height;
  display: flex;
  overflow: hidden;
}

.config-column {
  width: 380px;
  background: $un-color-black-5;
  border-right: 1px solid $un-color-black-10;
  display: flex;
  flex-direction: column;

  h3 {
    margin-bottom: 10px;
  }

  header,
  section {
    padding: 20px;
  }

  section {
    border-top: 1px solid $un-color-black-10;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .btn-default {
    background: white;

    &:hover {
      background: $un-color-black-5;
    }
  }
}

.model-run-parameters-section {
  flex-shrink: 1;
  overflow-y: auto;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.model-details {
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &:not(.expanded) p {
    // Show only the first 3 lines. Supported with -webkit- prefix in all modern browsers.
    // https://caniuse.com/?search=line-clamp
    overflow-y: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .expand-collapse-controls {
    opacity: 0;
    display: inline-block;
    position: absolute;
    top: 100%;
    width: 100%;
    text-align: center;
  }

  &:hover {
    .expand-collapse-controls {
      opacity: 1;
    }
  }
}

.output-variables {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.labelled-dropdowns {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.labelled-dropdown {
  display: flex;
  gap: 5px;

  p {
    flex: 1;
    min-width: 0;
  }

  button {
    width: 122px; /* TODO: extract variable */
  }
}

.media-files {
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: space-between;
}

.visualization-container {
  flex: 1;
  min-width: 0;
  background: white;
  display: flex;
  flex-direction: column;
}

.date-selector {
  height: 200px;
  border-bottom: 1px solid $un-color-black-10;
  padding: 20px;

  .selected-date {
    margin-top: 10px;
  }
}

.date-dependent-data {
  flex: 1;
  min-height: 0;
  display: flex;
  padding: 20px;
}

.maps {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;

  .card-maps-box {
    flex: 1;
    min-height: 0;
    display: flex;
  }

  $marginSize: 5px;

  .card-map-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;

    :deep(.wm-map) {
      border-style: solid;
      border-color: inherit;
    }
    &.card-count-1 {
      :deep(.wm-map) {
        border: none;
      }
    }
    &.card-count-2,
    &.card-count-3,
    &.card-count-4 {
      min-width: calc(50% - calc($marginSize / 2));
      max-width: calc(50% - calc($marginSize / 2));
    }
    &.card-count-n {
      min-width: calc(calc(100% / 3) - calc($marginSize * 2 / 3));
      max-width: calc(calc(100% / 3) - calc($marginSize * 2 / 3));
    }
  }

  & > button {
    align-self: flex-start;
  }
}
.card-map {
  flex-grow: 1;
  min-height: 0;
}

.breakdown-column {
  width: 300px;
}
</style>
