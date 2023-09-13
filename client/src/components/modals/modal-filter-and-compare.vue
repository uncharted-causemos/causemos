<template>
  <Modal>
    <template #header>
      <h4 class="title">Filter and compare</h4>
    </template>
    <template #body>
      <RadioButtonGroup
        class="radio-button-group"
        :buttons="tabs"
        :selected-button-value="selectedTabValue"
        @button-clicked="selectTab"
      />
    </template>
    <template #footer>
      <ul class="unstyled-list">
        <button type="button" class="btn btn-default" @click.stop="emit('close')">Cancel</button>
        <button
          type="button"
          class="btn btn-default btn-call-to-action"
          @click.stop="applyBreakdownState"
        >
          Apply
        </button>
      </ul>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import {
  BreakdownState,
  BreakdownStateNone,
  BreakdownStateOutputs,
  BreakdownStateQualifiers,
  BreakdownStateRegions,
  BreakdownStateYears,
  DatacubeFeature,
  FeatureQualifier,
} from '@/types/Datacube';
import Modal from './modal.vue';
import { computed, ref } from 'vue';
import RadioButtonGroup, { RadioButtonSpec } from '../widgets/radio-button-group.vue';
import {
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';

const NO_FILTERS = 'No filters';
const OUTPUTS = 'Outputs';
const REGIONS = 'Regions';
const YEARS = 'Years';

const props = defineProps<{
  initialBreakdownState: BreakdownState;
  qualifiers: FeatureQualifier[];
  outputs: DatacubeFeature[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply-breakdown-state', breakdownState: BreakdownState): void;
}>();

const breakdownState = ref(props.initialBreakdownState);
const applyBreakdownState = () => {
  emit('apply-breakdown-state', breakdownState.value);
};

const tabs = computed<RadioButtonSpec[]>(() => {
  const areOptionsDisabled =
    isBreakdownStateNone(breakdownState.value) && breakdownState.value.modelRunIds.length > 1;
  return [
    { value: NO_FILTERS, label: NO_FILTERS },
    { value: OUTPUTS, label: OUTPUTS, isDisabled: areOptionsDisabled },
    { value: REGIONS, label: REGIONS, isDisabled: areOptionsDisabled },
    { value: YEARS, label: YEARS, isDisabled: areOptionsDisabled },
    ...props.qualifiers.map((qualifier) => ({
      value: qualifier.name,
      label: qualifier.display_name,
      isDisabled: areOptionsDisabled,
    })),
  ];
});

const selectedTabValue = computed(() => {
  const state = breakdownState.value;
  if (isBreakdownStateNone(state)) {
    return NO_FILTERS;
  }
  if (isBreakdownStateOutputs(state)) {
    return OUTPUTS;
  }
  if (isBreakdownStateRegions(state)) {
    return REGIONS;
  }
  if (isBreakdownStateYears(state)) {
    return YEARS;
  }
  return state.qualifier;
});

const selectTab = (tab: string) => {
  if (tab === NO_FILTERS) {
    const newState: BreakdownStateNone = {
      outputIndex: 0,
      modelRunIds: [],
      comparisonSettings: {
        indexOfBaselineTimeseries: 0,
        shouldDisplayAbsoluteValues: true,
        shouldUseRelativePercentage: false,
      },
    };
    breakdownState.value = newState;
  } else if (tab === OUTPUTS) {
    const newState: BreakdownStateOutputs = {
      modelRunId: '',
      outputIndices: [],
      comparisonSettings: {
        indexOfBaselineTimeseries: 0,
        shouldDisplayAbsoluteValues: true,
        shouldUseRelativePercentage: false,
      },
    };
    breakdownState.value = newState;
  } else if (tab === REGIONS) {
    const newState: BreakdownStateRegions = {
      modelRunId: '',
      outputIndex: 0,
      regionIds: [],
      comparisonSettings: {
        indexOfBaselineTimeseries: 0,
        shouldDisplayAbsoluteValues: true,
        shouldUseRelativePercentage: false,
      },
    };
    breakdownState.value = newState;
  } else if (tab === YEARS) {
    const newState: BreakdownStateYears = {
      modelRunId: '',
      outputIndex: 0,
      regionId: null,
      years: [],
      isAllYearsReferenceTimeseriesShown: false,
      isSelectedYearsReferenceTimeseriesShown: false,
      comparisonSettings: {
        indexOfBaselineTimeseries: 0,
        shouldDisplayAbsoluteValues: true,
        shouldUseRelativePercentage: false,
      },
    };
    breakdownState.value = newState;
  } else {
    const newState: BreakdownStateQualifiers = {
      modelRunId: '',
      outputIndex: 0,
      regionId: null,
      qualifier: '',
      qualifierValues: [],
      comparisonSettings: {
        indexOfBaselineTimeseries: 0,
        shouldDisplayAbsoluteValues: true,
        shouldUseRelativePercentage: false,
      },
    };
    breakdownState.value = newState;
  }
};
</script>

<style lang="scss" scoped>
:deep(.radio-button-group button) {
  width: 100px;
}
</style>
