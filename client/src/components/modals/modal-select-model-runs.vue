<template>
  <modal @close="close">
    <template #header>
      <h4 class="title">Select model runs</h4>
    </template>
    <template #body>
      <div class="main">
        <div class="column">
          <h5>Available model runs</h5>

          <parallel-coordinates-chart
            class="parallel-coordinates-chart"
            :dimensions-data="runParameterValues"
            :selected-dimensions="dimensions"
            :initial-data-selection="selectedModelRunIds"
            :new-runs-mode="isNewRunsModeActive"
            @select-scenario="setSelectedModelRuns"
            @generated-scenarios="updateGeneratedScenarios"
          />

          <h5
            @click="isModelRunsInProgressSectionExpanded = !isModelRunsInProgressSectionExpanded"
            style="cursor: pointer"
          >
            <i
              class="fa fa-fw"
              :class="[isModelRunsInProgressSectionExpanded ? 'fa-caret-down' : 'fa-caret-right']"
            />Model runs in progress ({{ modelRunsInProgress.length }})
          </h5>
          <div v-if="isModelRunsInProgressSectionExpanded">
            <model-run-in-progress
              v-for="run of modelRunsInProgress"
              :key="run.id"
              :metadata="metadata"
              :run="run"
              @retry-run="retryModelRun"
              @delete-run="deleteModelRun"
            />
          </div>
        </div>
        <div class="column">
          <h5 class="selected-model-run-header">Selected model runs</h5>
          <p v-if="selectedModelRunIds.length === 0" class="subdued un-font-small">
            Click a model run, or Shift+Click to select multiple.
          </p>
          <model-run-summary-list :metadata="metadata" :model-runs="selectedModelRuns" />
        </div>
      </div>
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button type="button" class="btn" @click.stop="close">Cancel</button>
        <button
          type="button"
          class="btn btn-call-to-action"
          @click.stop="updateSelectedModelRuns"
          :disabled="selectedModelRunIds.length === 0"
          v-tooltip="
            selectedModelRunIds.length === 0 ? 'Select one or more model runs to continue.' : ''
          "
        >
          Apply
        </button>
      </ul>
    </template>
  </modal>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue';
import Modal from './modal.vue';
import ParallelCoordinatesChart from '@/components/widgets/charts/parallel-coordinates.vue';
import useDatacubeDimensions from '@/composables/useDatacubeDimensions';
import { Model } from '@/types/Datacube';
import useParallelCoordinatesData from '@/composables/useParallelCoordinatesData';
import { AggregationOption, ModelRunStatus } from '@/types/Enums';
import useScenarioData from '@/composables/useScenarioData';
import { Filters } from '@/types/Filters';
import { ScenarioData } from '@/types/Common';
import { getFilteredScenariosFromIds } from '@/utils/datacube-util';
import ModelRunSummaryList from '@/components/model-drilldown/model-run-summary-list.vue';
import _ from 'lodash';
import ModelRunInProgress from '../model-drilldown/model-run-in-progress.vue';
import { createModelRun, updateModelRun } from '@/services/new-datacube-service';
import { TYPE } from 'vue-toastification';
import useToaster from '@/composables/useToaster';

const props = defineProps<{
  metadata: Model;
  currentOutputIndex: number;
  initialSelectedModelRunIds: string[];
}>();
const { metadata, currentOutputIndex } = toRefs(props);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update-selected-model-runs', selectedModelRunIds: string[]): void;
}>();
const close = () => emit('close');
const updateSelectedModelRuns = () => {
  emit('update-selected-model-runs', selectedModelRunIds.value);
  close();
};

const selectedSpatialAggregation = ref(AggregationOption.Sum);
const selectedTemporalAggregation = ref(AggregationOption.Sum);

const selectedModelId = computed(() => metadata.value?.id ?? null);
const modelRunSearchFilters = ref<Filters>({ clauses: [] });
const { dimensions } = useDatacubeDimensions(metadata, currentOutputIndex);
const isNewRunsModeActive = ref(false);
const { fetchModelRuns, allModelRunData, filteredRunData } = useScenarioData(
  selectedModelId,
  modelRunSearchFilters,
  dimensions,
  isNewRunsModeActive
);
const { runParameterValues } = useParallelCoordinatesData(
  metadata,
  filteredRunData,
  selectedSpatialAggregation,
  selectedTemporalAggregation,
  currentOutputIndex
);

const selectedModelRunIds = ref<string[]>(props.initialSelectedModelRunIds);
const setSelectedModelRuns = (e: { scenarios: ScenarioData[] }) => {
  selectedModelRunIds.value = e.scenarios
    .filter((s) => s.status === ModelRunStatus.Ready)
    .map((s) => s.run_id.toString());
};
const selectedModelRuns = computed(() =>
  getFilteredScenariosFromIds(selectedModelRunIds.value, filteredRunData.value)
);

const potentialScenarios = ref<ScenarioData[]>([]);
watch([isNewRunsModeActive], () => {
  potentialScenarios.value = [];
});
const updateGeneratedScenarios = (e: { scenarios: Array<ScenarioData> }) => {
  potentialScenarios.value = e.scenarios;
};

const modelRunsInProgress = computed(() => {
  // Remove runs that have completed successfully
  const runs = runParameterValues.value.filter((r) => r.status !== ModelRunStatus.Ready);
  // Remove "drilldown parameters" from each run
  const drilldownParamNames = metadata.value.parameters
    .filter((parameter) => parameter.is_drilldown)
    .map((parameter) => parameter.name);
  const runsWithoutDrilldownParameters = _.map(runs, (run) =>
    _.omit(run, [...drilldownParamNames])
  ) as ScenarioData[];
  // Sort by status and return
  return _.sortBy(runsWithoutDrilldownParameters, (run) => run.status);
});

const getModelRunById = (runId: string) =>
  allModelRunData.value.find((runData) => runData.id === runId);
const deleteModelRun = async (runId: string) => {
  const modelRun = getModelRunById(runId);
  if (modelRun) {
    const modelRunDeleted = _.cloneDeep(modelRun);
    modelRunDeleted.status = ModelRunStatus.Deleted;
    await updateModelRun(modelRunDeleted);
    // This is done for responsiveness so that the user immediately knows when a run is deleted
    fetchModelRuns();
  }
};
const toaster = useToaster();
const retryModelRun = async (runId: string) => {
  const modelRun = getModelRunById(runId);
  if (modelRun === undefined) {
    toaster('An error occured while retrying this model run.', TYPE.INFO);
    return;
  }
  try {
    const response = await createModelRun(
      modelRun.model_id,
      modelRun.model_name,
      modelRun.parameters,
      modelRun.is_default_run
    );
    if (response.data && response.data.run_id && response.data.run_id.length > 0) {
      toaster('Retrying model run.', TYPE.SUCCESS);
    } else {
      toaster('An error occured while retrying this model run.', TYPE.INFO);
    }
  } catch (error) {
    console.warn(error);
    toaster('An error occured while retrying this model run.', TYPE.INFO);
  }
  await deleteModelRun(runId);
};

const isModelRunsInProgressSectionExpanded = ref(false);

// Note about geographic-type and date-type model parameters.
//  (geoModelParam, modal-geo-selection, dateModelParam, date-range)
//  At time of writing (September 2023), no deployment of Causemos contains models with parameters
//  of type "geo", "date", or "date-range". It is not clear whether these features were ever fully
//  completed and integrated into the tool, and they have been omitted from the 2023 revision of
//  the Causemos "data space". Review the `datacube-card.vue` component at this point in the
//  repository history if you intend to reintroduce UI for these types of model parameters.
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';

:deep(.modal-container) {
  width: fit-content;
}
:deep(.modal-body) {
  padding-top: 0;
}

.main {
  display: flex;
  gap: 40px;
  overflow-y: auto;
  height: 850px;
}

.column {
  width: 400px;
}

.selected-model-run-header {
  margin-bottom: 20px;
}

.parallel-coordinates-chart {
  height: 800px;
}
</style>
