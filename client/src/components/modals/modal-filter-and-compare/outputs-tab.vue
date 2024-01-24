<template>
  <div class="outputs-tab-container">
    <p class="subdued un-font-small tab-description">
      Some models produce multiple outputs with each run. Select one or more of them here.
    </p>
    <div class="tab-content outputs">
      <div class="row-with-description">
        <dropdown-button
          :items="outputDropdownOptions"
          :selected-item="breakdownState.outputNames[0]"
          @item-selected="(outputName: string) => (breakdownState.outputNames[0] = outputName)"
          class="fixed-width-input"
        />
        <p class="subdued un-font-small">
          {{ getOutputDescription(outputs, breakdownState.outputNames[0]) }}
        </p>
      </div>

      <div
        v-for="(outputName, i) of breakdownState.outputNames.slice(1)"
        :key="i"
        class="row-with-description"
      >
        <div class="removable-row fixed-width-input">
          <dropdown-button
            :items="outputDropdownOptions"
            :selected-item="outputName"
            @item-selected="(outputName: string) => (breakdownState.outputNames[i + 1] = outputName)"
            class="fixed-width-input"
          />
          <button type="button" class="btn btn-default icon-button" @click="removeOutput(i + 1)">
            <i class="fa fa-fw fa-minus" />
          </button>
        </div>
        <p class="subdued un-font-small">
          {{ getOutputDescription(outputs, breakdownState.outputNames[i + 1]) }}
        </p>
      </div>
      <button class="btn btn-default fixed-width-input" @click="addOutput">
        <i class="fa fa-fw fa-plus" />Compare with another output
      </button>
      <p v-if="shouldShowWarning" class="warning un-font-small">
        <i class="fa fa-fw fa-exclamation-triangle"></i>
        The selected outputs have different units. Direct comparison may be invalid.
      </p>

      <ComparisonSettingsVue
        v-if="breakdownState.outputNames.length > 1"
        :comparison-baseline-options="comparisonBaselineOptions"
        :comparison-settings="breakdownState.comparisonSettings"
        :unit="shouldShowWarning ? '(outputs have different units)' : units[0]"
        @set-comparison-settings="setComparisonSettings"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import { BreakdownStateOutputs, ComparisonSettings, Indicator, Model } from '@/types/Datacube';
import {
  ensureBaselineFoundInTimeseriesIds,
  getOutputDescription,
  getOutputDisplayName,
} from '@/utils/datacube-util';
import { computed, toRefs, watch } from 'vue';
import ComparisonSettingsVue from './comparison-settings.vue';

const props = defineProps<{
  breakdownState: BreakdownStateOutputs;
  metadata: Model | Indicator;
}>();
const { breakdownState, metadata } = toRefs(props);
const emit = defineEmits<{
  (e: 'set-breakdown-state', breakdownState: BreakdownStateOutputs): void;
}>();

const outputs = computed(() => metadata.value.outputs);
const outputDropdownOptions = computed<DropdownItem[]>(() =>
  outputs.value.map((output) => ({
    displayName: output.display_name,
    value: output.name,
  }))
);

const addOutput = () => {
  const newState: BreakdownStateOutputs = {
    ...breakdownState.value,
    outputNames: [...breakdownState.value.outputNames, outputDropdownOptions.value[0].value],
  };
  emit('set-breakdown-state', newState);
};
const removeOutput = (positionInSelectedOutputsList: number) => {
  const newState: BreakdownStateOutputs = {
    ...breakdownState.value,
    outputNames: [
      ...breakdownState.value.outputNames.filter((_, i) => i !== positionInSelectedOutputsList),
    ],
  };
  emit('set-breakdown-state', newState);
};

const comparisonBaselineOptions = computed<DropdownItem[]>(() =>
  breakdownState.value.outputNames.map((outputName) => ({
    value: outputName,
    displayName: getOutputDisplayName(metadata.value.outputs, outputName),
  }))
);

const setComparisonSettings = (newComparisonSettings: ComparisonSettings) => {
  const validatedComparisonSettings = ensureBaselineFoundInTimeseriesIds(
    newComparisonSettings,
    breakdownState.value.outputNames
  );
  const newState: BreakdownStateOutputs = {
    ...breakdownState.value,
    comparisonSettings: validatedComparisonSettings,
  };
  emit('set-breakdown-state', newState);
};
watch(breakdownState, () => {
  const validatedComparisonSettings = ensureBaselineFoundInTimeseriesIds(
    breakdownState.value.comparisonSettings,
    breakdownState.value.outputNames
  );
  if (validatedComparisonSettings === breakdownState.value.comparisonSettings) {
    // Baseline was already found in region IDs
    return;
  }
  const newState: BreakdownStateOutputs = {
    ...breakdownState.value,
    comparisonSettings: validatedComparisonSettings,
  };
  emit('set-breakdown-state', newState);
});

const units = computed(() =>
  breakdownState.value.outputNames.map(
    (outputName) => metadata.value.outputs.find((output) => output.name === outputName)?.unit ?? ''
  )
);

const shouldShowWarning = computed(() => {
  const set = new Set<string>();
  units.value.forEach((unit) => set.add(unit));
  return set.size > 1;
});
</script>

<style lang="scss" scoped>
@import '@/styles/common';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/modal-filter-and-compare';
.outputs-tab-container {
  display: flex;
  flex-direction: column;
}
.outputs {
  gap: 15px;
}
.warning {
  color: $un-color-feedback-warning;
}
</style>
