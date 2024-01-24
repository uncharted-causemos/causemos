<template>
  <div class="no-filters-tab-container">
    <p v-if="areTabsDisabled" class="subdued un-font-small tab-description">
      No more than one model run may be selected to filter and compare
      {{ namesOfSplitByOptions }}.
    </p>
    <p class="tab-content">
      Aggregated data from all {{ namesOfSplitByOptions }} will be displayed.
    </p>

    <ComparisonSettingsVue
      v-if="breakdownState.modelRunIds.length > 1"
      :comparison-baseline-options="comparisonBaselineOptions"
      :comparison-settings="breakdownState.comparisonSettings"
      :unit="unit"
      @set-comparison-settings="setComparisonSettings"
    />
  </div>
</template>

<script setup lang="ts">
import { DropdownItem } from '@/components/dropdown-button.vue';
import useDatacubeDimensions from '@/composables/useDatacubeDimensions';
import useScenarioData from '@/composables/useScenarioData';
import { BreakdownStateNone, ComparisonSettings, Indicator, Model } from '@/types/Datacube';
import { Filters } from '@/types/Filters';
import { ensureBaselineFoundInTimeseriesIds, getOutputs } from '@/utils/datacube-util';
import { computed, ref, toRefs, watch } from 'vue';
import ComparisonSettingsVue from './comparison-settings.vue';

const props = defineProps<{
  breakdownState: BreakdownStateNone;
  metadata: Model | Indicator;
  areTabsDisabled: boolean;
  namesOfSplitByOptions: string;
}>();

const emit = defineEmits<{
  (e: 'set-breakdown-state', breakdownState: BreakdownStateNone): void;
}>();
const { breakdownState, metadata } = toRefs(props);

const selectedModelId = computed(() => metadata.value?.id ?? null);
const currentOutputIndex = computed(() => {
  const outputs = getOutputs(metadata.value);
  return outputs.findIndex((output) => output.name === breakdownState.value.outputName);
});
const { dimensions } = useDatacubeDimensions(metadata, currentOutputIndex);
const { getModelRunById } = useScenarioData(
  selectedModelId,
  ref<Filters>({ clauses: [] }),
  dimensions,
  ref(false)
);

const comparisonBaselineOptions = computed<DropdownItem[]>(() =>
  breakdownState.value.modelRunIds.map((modelRunId) => ({
    value: modelRunId,
    displayName: getModelRunById(modelRunId)?.name ?? modelRunId,
  }))
);

const setComparisonSettings = (newComparisonSettings: ComparisonSettings) => {
  const validatedComparisonSettings = ensureBaselineFoundInTimeseriesIds(
    newComparisonSettings,
    breakdownState.value.modelRunIds
  );
  const newState: BreakdownStateNone = {
    ...breakdownState.value,
    comparisonSettings: validatedComparisonSettings,
  };
  emit('set-breakdown-state', newState);
};
watch(breakdownState, () => {
  const validatedComparisonSettings = ensureBaselineFoundInTimeseriesIds(
    breakdownState.value.comparisonSettings,
    breakdownState.value.modelRunIds
  );
  if (validatedComparisonSettings === breakdownState.value.comparisonSettings) {
    // Baseline was already found in region IDs
    return;
  }
  const newState: BreakdownStateNone = {
    ...breakdownState.value,
    comparisonSettings: validatedComparisonSettings,
  };
  emit('set-breakdown-state', newState);
});

const unit = computed(
  () =>
    metadata.value.outputs.find((output) => output.name === breakdownState.value.outputName)
      ?.unit ?? ''
);
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/modal-filter-and-compare';
.no-filters-tab-container {
}
</style>
