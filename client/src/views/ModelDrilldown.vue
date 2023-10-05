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
        <!-- TODO: v-if="visibleTimeseriesData.length > 0 && selectedTimestamp !== null" -->
        <!-- TODO: dynamically fetch time series data -->
        <timeseries-chart
          class="timeseries-chart"
          :timeseries-data="[
            {
              color: '#8767C8',
              correctiveAction: IncompleteDataCorrectiveAction.NotRequired,
              id: '17bbe11b-5c28-4bbb-8f00-3f585e7a55af',
              isDefaultRun: false,
              name: 'Default',
              points: [
                { timestamp: 1328054400000, value: 1548.2857142857142 },
                { timestamp: 1330560000000, value: 2760.6082949308757 },
                { timestamp: 1354320000000, value: 12822.57738095238 },
              ],
            },
          ]"
          :selected-timestamp="1354320000000"
          :breakdown-option="null"
          :selected-temporal-resolution="TemporalResolutionOption.Month"
          :unit="''"
          @select-timestamp="setSelectedTimestamp"
        />
        <p class="selected-date"><span class="subdued">Selected date:</span> December 2012</p>
      </div>
      <div class="date-dependent-data">
        <div class="maps">
          <!-- TODO: map components -->
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
      v-if="isFilterAndCompareModalOpen && metadata !== null"
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
import useModelMetadata from '@/composables/useModelMetadata';
import TimeseriesChart from '@/components/widgets/charts/timeseries-chart.vue';
import { Ref, computed, ref, watch } from 'vue';
import {
  DatacubeGeoAttributeVariableType,
  IncompleteDataCorrectiveAction,
  TemporalResolutionOption,
} from '@/types/Enums';
import { BreakdownState, DatacubeFeature, Model } from '@/types/Datacube';
import {
  getFilteredScenariosFromIds,
  getOutput,
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  getFirstDefaultModelRun,
} from '@/utils/datacube-util';
import useScenarioData from '@/composables/useScenarioData';
import stringUtil from '@/utils/string-util';
import ModalSelectModelRuns from '@/components/modals/modal-select-model-runs.vue';
import ModelRunSummaryList from '@/components/model-drilldown/model-run-summary-list.vue';
import ModalFilterAndCompare from '@/components/modals/modal-filter-and-compare.vue';
import { getDefaultFeature } from '@/services/datacube-service';

const breakdownState = ref<BreakdownState>({
  // TODO: use real values
  modelRunIds: [],
  outputName: '',
  comparisonSettings: {
    baselineTimeseriesId: '',
    shouldDisplayAbsoluteValues: true,
    shouldUseRelativePercentage: false,
  },
});
const modelId = ref('2c461d67-35d9-4518-9974-30083a63bae5');
const metadata = useModelMetadata(modelId) as Ref<Model | null>;

const isModelDetailsSectionExpanded = ref(false);

const firstOutputName = computed<string | null>(() => {
  if (metadata.value === null) return null;
  return isBreakdownStateOutputs(breakdownState.value)
    ? breakdownState.value.outputNames[0]
    : breakdownState.value.outputName;
});
watch([metadata], () => {
  if (metadata.value === null) {
    return;
  }
  const outputName = getDefaultFeature(metadata.value)?.name ?? null;
  if (outputName === null) {
    return;
  }
  if (isBreakdownStateOutputs(breakdownState.value)) {
    breakdownState.value = {
      ...breakdownState.value,
      outputNames: [outputName],
    };
    return;
  }
  breakdownState.value = {
    ...breakdownState.value,
    outputName,
  };
});
// TODO: add support for multiple selected output variables
const activeOutputVariable = computed<DatacubeFeature | null>(() => {
  if (metadata.value === null || firstOutputName.value === null) {
    return null;
  }
  return getOutput(metadata.value, firstOutputName.value) ?? null;
});

const { filteredRunData } = useScenarioData(modelId, ref({ clauses: [] }), ref([]), ref(false));

const selectedModelRunIds = computed(() =>
  isBreakdownStateNone(breakdownState.value)
    ? breakdownState.value.modelRunIds
    : [breakdownState.value.modelRunId]
);
const setSelectedModelRunIds = (newRunIds: string[]) => {
  if (isBreakdownStateNone(breakdownState.value)) {
    breakdownState.value = {
      ...breakdownState.value,
      modelRunIds: [...newRunIds],
    };
    return;
  }
  // TODO: gracefully handle if the user has a breakdown state selected that doesn't support multiple model run ids
  breakdownState.value = {
    ...breakdownState.value,
    modelRunId: newRunIds[0],
  };
};
// When model run data is first fetched, select the default model run
watch(
  [filteredRunData],
  () => {
    const defaultModelRun = getFirstDefaultModelRun(filteredRunData.value);
    if (defaultModelRun === undefined) {
      return;
    }
    setSelectedModelRunIds([defaultModelRun.id]);
  },
  { immediate: true }
);
const selectedModelRuns = computed(() =>
  getFilteredScenariosFromIds(selectedModelRunIds.value, filteredRunData.value)
);

const isSelectModelRunsModalOpen = ref(false);

const isFilterAndCompareModalOpen = ref(false);

const setSelectedTimestamp = () => console.log('TODO:');

const spatialAggregation = ref<DatacubeGeoAttributeVariableType | 'tiles'>(
  DatacubeGeoAttributeVariableType.Country
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
}

.breakdown-column {
  width: 300px;
}
</style>
