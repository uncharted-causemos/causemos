<template>
  <div class="model-drilldown-container insight-capture">
    <div class="config-column">
      <ModelOrDatasetMetadata :metadata="metadata" />
      <section v-if="metadata !== null" class="model-run-parameters-section">
        <div class="section-header">
          <h4>Model run parameters</h4>
          <button @click="isSelectModelRunsModalOpen = true" class="btn btn-default btn-white">
            Select model runs
          </button>
        </div>

        <ModelRunSummaryList :metadata="metadata" :model-runs="selectedModelRuns" />
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
            <DropdownButton
              :items="SPATIAL_AGGREGATION_METHOD_OPTIONS"
              :selected-item="spatialAggregationMethod"
              :is-white="true"
              :is-dropdown-above="true"
              @item-selected="setSpatialAggregationMethod"
            />
          </div>

          <div class="labelled-dropdown">
            <p class="subdued">Temporal resolution</p>
            <DropdownButton
              :items="TEMPORAL_RESOLUTION_OPTIONS"
              :selected-item="temporalResolution"
              :is-white="true"
              :is-dropdown-above="true"
              @item-selected="setTemporalResolution"
            />
          </div>

          <div class="labelled-dropdown">
            <p class="subdued">Spatial resolution</p>
            <DropdownButton
              :items="spatialAggregationDropdownOptions"
              :selected-item="spatialAggregation"
              :is-white="true"
              :is-dropdown-above="true"
              @item-selected="setSpatialAggregation"
            />
          </div>
        </div>

        <button @click="isFilterAndCompareModalOpen = true" class="btn btn-default btn-white">
          Filter and compare
        </button>

        <div class="media-files">
          <span class="subdued un-font-small">This model produces media files.</span>
          <button class="btn btn-default btn-white">View supporting media</button>
        </div>
      </section>
    </div>
    <div class="visualization-container">
      <div class="date-selector">
        <TimeseriesChart
          v-if="timeseriesData.length > 0 && selectedTimestamp !== null"
          class="timeseries-chart"
          :timeseries-data="timeseriesData"
          :selected-timestamp="selectedTimestamp"
          :breakdown-option="null"
          :selected-temporal-resolution="TemporalResolutionOption.Month"
          :unit="activeOutputVariable?.unit ?? ''"
          @select-timestamp="setSelectedTimestamp"
        />
        <p class="selected-date"><span class="subdued">Selected date:</span> December 2012</p>
      </div>
      <div class="date-dependent-data">
        <div class="maps">
          <div class="card-maps-box" v-if="breakdownState !== null && regionalData !== null">
            <NewAnalysisMap
              v-for="spec of outputSpecs"
              :key="spec.id"
              class="new-analysis-map"
              :class="[`card-count-${outputSpecs.length < 5 ? outputSpecs.length : 'n'}`]"
              :color="getColorFromTimeseriesId(spec.id)"
              :breakdown-state="breakdownState"
              :metadata="metadata"
              :regional-data="regionalData"
              :output-specs="outputSpecs"
              :output-spec-id="spec.id"
              :unit="activeOutputVariable?.unit ?? ''"
              :spatial-aggregation="spatialAggregation"
              :map-bounds="getMapBounds(spec.id)"
              @map-move="onMapMove"
            />
          </div>
          <button class="btn btn-default"><i class="fa fa-fw fa-gear" />Map options</button>
        </div>
        <BarChartPanel
          v-if="breakdownState !== null"
          class="bar-chart-panel"
          :raw-data="regionalData"
          :breakdown-state="breakdownState"
          :aggregation-level="stringToAdminLevel(spatialAggregation)"
          :unit="activeOutputVariable?.unit ?? ''"
          :get-color-from-timeseries-id="getColorFromTimeseriesId"
          :aggregation-method="spatialAggregationMethod"
          :output-name="activeOutputVariable?.display_name ?? ''"
        />
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
      :aggregation-method="spatialAggregationMethod"
      :initial-breakdown-state="breakdownState"
      @close="isFilterAndCompareModalOpen = false"
      @apply-breakdown-state="setBreakdownState"
      @set-spatial-aggregation="(newValue) => (spatialAggregation = newValue)"
    />
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import useModelMetadata from '@/composables/useModelMetadata';
import TimeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import { Ref, computed, onMounted, ref, watch } from 'vue';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { BreakdownStateNone, DatacubeFeature, Model } from '@/types/Datacube';
import {
  getFilteredScenariosFromIds,
  getOutput,
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  isBreakdownStateYears,
} from '@/utils/datacube-util';
import useScenarioData from '@/composables/useScenarioData';
import useTimeseriesDataFromBreakdownState from '@/composables/useTimeseriesDataFromBreakdownState';
import ModalSelectModelRuns from '@/components/modals/modal-select-model-runs.vue';
import ModelRunSummaryList from '@/components/model-drilldown/model-run-summary-list.vue';
import ModalFilterAndCompare from '@/components/modals/modal-filter-and-compare.vue';
import useToaster from '@/composables/useToaster';
import { TYPE } from 'vue-toastification';
import useRegionalDataFromBreakdownState from '@/composables/useRegionalDataFromBreakdownState';
import useOutputSpecsFromBreakdownState from '@/composables/useOutputSpecsFromBreakdownState';
import NewAnalysisMap from '@/components/data/new-analysis-map.vue';
import useMapBoundsFromBreakdownState from '@/composables/useMapBoundsFromBreakdownState';
import { useAvailableRegions } from '@/composables/useAvailableRegions';
import { useRegionalDropdownOptions } from '@/composables/useRegionalDropdownOptions';
import DropdownButton from '@/components/dropdown-button.vue';
import BarChartPanel from '@/components/drilldown-panel/bar-chart-panel.vue';
import { stringToAdminLevel } from '@/utils/admin-level-util';
import useTimeseriesIdToColorMap from '@/composables/useTimeseriesIdToColorMap';
import useModelDrilldownState from '@/composables/useModelDrilldownState';
import useInsightStore from '@/composables/useInsightStore';
import ModelOrDatasetMetadata from '@/components/model-drilldown/model-or-dataset-metadata.vue';

const SPATIAL_AGGREGATION_METHOD_OPTIONS = [AggregationOption.Mean, AggregationOption.Sum];
const TEMPORAL_RESOLUTION_OPTIONS = [TemporalResolutionOption.Month, TemporalResolutionOption.Year];

const modelId = ref('2c461d67-35d9-4518-9974-30083a63bae5');
const metadata = useModelMetadata(modelId) as Ref<Model | null>;
const { filteredRunData } = useScenarioData(modelId, ref({ clauses: [] }), ref([]), ref(false));

const { setContextId } = useInsightStore();
onMounted(() => {
  // TODO: if loading analysis item, use the analysis item ID as the context ID.
  // If loading from an index node, use the node ID.
  // This is used to determine which insights should be displayed in the navbar dropdown for this
  //  page.
  setContextId('analysis item ID goes here');
});

const {
  breakdownState,
  setBreakdownState,
  spatialAggregation,
  setSpatialAggregation,
  spatialAggregationMethod,
  setSpatialAggregationMethod,
  temporalResolution,
  setTemporalResolution,
  temporalAggregationMethod,
  selectedTimestamp,
  setSelectedTimestamp,
} = useModelDrilldownState(metadata);

const firstOutputName = computed<string | null>(() => {
  if (breakdownState.value === null) return null;
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
    setBreakdownState({
      ...breakdownState.value,
      modelRunIds: [...newRunIds],
    });
    return;
  }
  if (newRunIds.length === 1) {
    setBreakdownState({
      ...breakdownState.value,
      modelRunId: newRunIds[0],
    });
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
  setBreakdownState(newBreakdownState);
};
const selectedModelRuns = computed(() =>
  getFilteredScenariosFromIds(selectedModelRunIds.value, filteredRunData.value)
);

const isSelectModelRunsModalOpen = ref(false);
const isFilterAndCompareModalOpen = ref(false);

const { availableRegions } = useAvailableRegions(metadata, breakdownState);
const { spatialAggregationDropdownOptions } = useRegionalDropdownOptions(
  availableRegions,
  spatialAggregation
);

const { timeseriesData } = useTimeseriesDataFromBreakdownState(
  breakdownState,
  metadata,
  spatialAggregationMethod,
  temporalAggregationMethod,
  temporalResolution
);

// There is a brief state when switching to/from "split by years" mode where the timestamp is
//  in milliseconds or months when it should be the opposite. In those cases, reset
//  selectedTimestamp until the new timeseries data triggers the watcher below.
watch(breakdownState, (newValue, oldValue) => {
  if (newValue === null || oldValue === null) return;
  const isSwitchingToSplitByYears =
    isBreakdownStateYears(newValue) && !isBreakdownStateYears(oldValue);
  const isSwitchingFromSplitByYears =
    isBreakdownStateYears(newValue) && !isBreakdownStateYears(oldValue);
  if (isSwitchingToSplitByYears || isSwitchingFromSplitByYears) {
    setSelectedTimestamp(null);
  }
});
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

const { onMapMove, getMapBounds } = useMapBoundsFromBreakdownState(breakdownState, regionalData);
const { getColorFromTimeseriesId } = useTimeseriesIdToColorMap(breakdownState);
</script>

<style lang="scss" scoped>
@import '@/styles/common';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/variables';

$configColumnButtonWidth: 122px;

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
  align-items: baseline;

  p {
    flex: 1;
    min-width: 0;
  }

  & :deep(.dropdown-btn) {
    width: $configColumnButtonWidth;
    display: flex;
    justify-content: space-between;
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
  // The bar chart panel needs to specify its own padding so that its "sortable header" tooltips
  //  aren't clipped for being outside of its bounding box.
  padding-right: 0;
}

.maps {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  .card-maps-box {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 2px;
    flex-wrap: wrap;
  }

  $marginSize: 5px;

  .new-analysis-map {
    flex-grow: 1;

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

.bar-chart-panel {
  width: 300px;
}
</style>
