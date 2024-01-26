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
        <h4>Displayed output{{ selectedOutputs.length > 1 ? 's' : '' }}</h4>

        <div class="output-variables">
          <div
            v-for="outputVariable of selectedOutputs"
            :key="outputVariable.name"
            class="output-variable"
          >
            <p>{{ outputVariable?.display_name ?? '...' }}</p>
            <span class="subdued un-font-small">{{ outputVariable?.description ?? '...' }}</span>
            <p class="unit"><span class="subdued">Unit:</span> {{ outputVariable?.unit }}</p>
          </div>
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

        <!-- TODO: re-add support for media files -->
        <!-- <div class="media-files">
          <span class="subdued un-font-small">This model produces media files.</span>
          <button class="btn btn-default btn-white">View supporting media</button>
        </div> -->
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
          :unit="originalUnit"
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
              :original-unit="getUnitFromTimeseriesId(spec.id)"
              :unit-with-comparison-state-applied="unitWithComparisonStateApplied"
              :spatial-aggregation="spatialAggregation"
              :map-bounds="getMapBounds(spec.id)"
              @map-move="onMapMove"
            />
          </div>
          <!-- TODO: re-add support for map options -->
          <!-- <button class="btn btn-default"><i class="fa fa-fw fa-gear" />Map options</button> -->
        </div>
        <BarChartPanel
          v-if="breakdownState !== null"
          class="bar-chart-panel"
          :raw-data="regionalData"
          :aggregation-level="stringToAdminLevel(spatialAggregation)"
          :unit="originalUnit"
          :get-color-from-timeseries-id="getColorFromTimeseriesId"
          :aggregation-method="spatialAggregationMethod"
          :comparison-settings="breakdownState.comparisonSettings"
        />
      </div>
    </div>

    <ModalSelectModelRuns
      v-if="isSelectModelRunsModalOpen && metadata !== null && selectedOutputs.length > 0"
      :metadata="metadata"
      :current-output-name="selectedOutputs[0].name"
      :initial-selected-model-run-ids="selectedModelRunIds"
      @close="isSelectModelRunsModalOpen = false"
      @update-selected-model-runs="setSelectedModelRunIds"
    />

    <ModalFilterAndCompare
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
import { useRoute } from 'vue-router';
import useModelMetadata from '@/composables/useModelMetadata';
import TimeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import { Ref, computed, onMounted, ref, watch } from 'vue';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { BreakdownStateNone, ComparisonSettings, DatacubeFeature, Model } from '@/types/Datacube';
import {
  getFilteredScenariosFromIds,
  getOutput,
  getOutputNamesFromBreakdownState,
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
import useModelOrDatasetUnits from '@/composables/useModelOrDatasetUnits';
import { useStore } from 'vuex';
import { getAnalysis } from '@/services/analysis-service';

const SPATIAL_AGGREGATION_METHOD_OPTIONS = [AggregationOption.Mean, AggregationOption.Sum];
const TEMPORAL_RESOLUTION_OPTIONS = [TemporalResolutionOption.Month, TemporalResolutionOption.Year];

const route = useRoute();
const datacubeId = computed(() => route.params.datacubeId as string);

const metadata = useModelMetadata(datacubeId) as Ref<Model | null>;
const { filteredRunData } = useScenarioData(datacubeId, ref({ clauses: [] }), ref([]), ref(false));

const { setContextId } = useInsightStore();
onMounted(() => {
  // If loading analysis item, use the analysis item ID as the context ID.
  // TODO: If loading from an index node, use the node ID.
  // This is used to determine which insights should be displayed in the navbar dropdown for this
  //  page.
  if (route.query.analysis_item_id) setContextId(route.query.analysis_item_id as string);
});

const store = useStore();
onMounted(async () => {
  store.dispatch('app/setAnalysisName', '');
  const analysisId = route.query.analysis_id as string | undefined;
  if (analysisId === undefined) return;
  const result = await getAnalysis(analysisId);
  if (result) {
    store.dispatch('app/setAnalysisName', result.title);
  }
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

const selectedOutputs = computed<DatacubeFeature[]>(() => {
  const _metadata = metadata.value;
  if (_metadata === null || breakdownState.value === null) {
    return [];
  }
  const outputNames = getOutputNamesFromBreakdownState(breakdownState.value);
  return (
    outputNames
      .map((outputName) => getOutput(_metadata, outputName) ?? null)
      // Assert that no items in the array are null after this operation
      .filter((output) => output !== null) as DatacubeFeature[]
  );
});

const { originalUnit, unitWithComparisonStateApplied, getUnitFromTimeseriesId } =
  useModelOrDatasetUnits(breakdownState, metadata, selectedOutputs);

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
    // If we're changing the selected run IDs while "BreakdownStateNone" ("split by model runs")
    //  is active, ensure that "relative to" mode is disabled to avoid an invalid state where the
    //  baseline model run is no longer among the selected runs, or there is only one run selected.
    const newComparisonSettings: ComparisonSettings = {
      ...breakdownState.value.comparisonSettings,
      shouldDisplayAbsoluteValues: true,
    };
    setBreakdownState({
      ...breakdownState.value,
      comparisonSettings: newComparisonSettings,
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
  gap: 15px;

  .unit {
    margin-top: 5px;
  }
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
