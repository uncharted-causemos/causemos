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
            @geo-selection="openGeoSelectionModal"
          />
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
import { Model, ModelParameter } from '@/types/Datacube';
import useParallelCoordinatesData from '@/composables/useParallelCoordinatesData';
import { AggregationOption, ModelRunStatus } from '@/types/Enums';
import useScenarioData from '@/composables/useScenarioData';
import { Filters } from '@/types/Filters';
import { ScenarioData } from '@/types/Common';
import { getFilteredScenariosFromIds } from '@/utils/datacube-util';
import ModelRunSummaryList from '@/components/model-drilldown/model-run-summary-list.vue';

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
const { filteredRunData } = useScenarioData(
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
  // TODO:
  // updatePotentialScenarioDates();
};

// const updatePotentialScenarioDates = () => {
//   // since any date or datarange params are not automatically considered,
//   //  we need to ensure they are added as part of potential scenarios data
//   if (dateModelParam.value !== null) {
//     // FIXME: handle the case of multiple date and/or daterange params
//     const delimiter =
//       dateModelParam.value.additional_options?.date_range_delimiter ?? DEFAULT_DATE_RANGE_DELIMETER;
//     let dateValue = '';
//     if (dateParamPickerValue.value === null || dateParamPickerValue.value === '') {
//       dateValue = dateModelParam.value.default;
//     } else {
//       dateValue =
//         dateModelParam.value.type === DatacubeGenericAttributeVariableType.Date
//           ? dateParamPickerValue.value
//           : dateParamPickerValue.value.replace(' to ', delimiter);
//     }
//     potentialScenarios.value.forEach((run) => {
//       if (dateModelParam.value !== null) {
//         run[dateModelParam.value.name] = dateValue;
//       }
//     });
//   }
// };

// watch(
//   () => [dateParamPickerValue.value],
//   () => {
//     updatePotentialScenarioDates();
//   }
// );

// TODO:
const showGeoSelectionModal = ref<boolean>(false);
const geoModelParam = ref<ModelParameter | null>(null);
const openGeoSelectionModal = (modelParam: ModelParameter) => {
  showGeoSelectionModal.value = true;
  geoModelParam.value = modelParam;
};
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
