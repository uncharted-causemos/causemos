<template>
  <Modal @close="emit('close')">
    <template #header>
      <h4 class="title">Filter and compare</h4>
    </template>
    <template #body>
      <RadioButtonGroup
        class="radio-button-group"
        :buttons="tabs"
        :selected-button-value="selectedTab"
        @button-clicked="selectTab"
      />

      <no-filters-tab
        v-if="selectedTab === NO_FILTERS"
        :are-tabs-disabled="areTabsDisabled"
        :names-of-split-by-options="namesOfSplitByOptions"
      />
      <outputs-tab
        v-else-if="selectedTab === OUTPUTS"
        :breakdown-state="breakdownStateOutputs"
        :metadata="metadata"
        @set-breakdown-state="(newState) => (breakdownStateOutputs = newState)"
      />
      <regions-tab
        v-else-if="selectedTab === REGIONS"
        :breakdown-state="breakdownStateRegions"
        :metadata="metadata"
        :spatial-aggregation="spatialAggregation"
        @set-breakdown-state="(newState) => (breakdownStateRegions = newState)"
        @set-spatial-aggregation="setSpatialAggregation"
      />
      <years-tab
        v-else-if="selectedTab === YEARS"
        :breakdown-state="breakdownStateYears"
        :metadata="metadata"
        :spatial-aggregation="spatialAggregation"
        :aggregation-method="aggregationMethod"
        @set-breakdown-state="(newState) => (breakdownStateYears = newState)"
        @set-spatial-aggregation="setSpatialAggregation"
      />

      <qualifier-tab
        v-else
        :breakdown-state="breakdownStatesQualifier[selectedTab]"
        :metadata="metadata"
        :spatial-aggregation="spatialAggregation"
        :aggregation-method="aggregationMethod"
        :qualifier-display-name="
          qualifiers.find(({ name }) => name === selectedTab)?.display_name ?? selectedTab
        "
        @set-breakdown-state="(newState) => (breakdownStatesQualifier[selectedTab] = newState)"
        @set-spatial-aggregation="setSpatialAggregation"
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
import _ from 'lodash';
import {
  BreakdownState,
  BreakdownStateNone,
  BreakdownStateOutputs,
  BreakdownStateQualifiers,
  BreakdownStateRegions,
  BreakdownStateYears,
  Indicator,
  Model,
} from '@/types/Datacube';
import Modal from './modal.vue';
import NoFiltersTab from './modal-filter-and-compare/no-filters-tab.vue';
import OutputsTab from './modal-filter-and-compare/outputs-tab.vue';
import RegionsTab from './modal-filter-and-compare/regions-tab.vue';
import YearsTab from './modal-filter-and-compare/years-tab.vue';
import QualifierTab from './modal-filter-and-compare/qualifier-tab.vue';
import { computed, onMounted, ref, toRefs, watch } from 'vue';
import RadioButtonGroup, { RadioButtonSpec } from '../widgets/radio-button-group.vue';
import {
  getValidatedOutputs,
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';
import { AggregationOption, SpatialAggregation } from '@/types/Enums';
import { isBreakdownQualifier } from '@/utils/qualifier-util';
import { getDefaultFeature } from '@/services/datacube-service';
import useQualifierFetchInfo from '@/composables/useQualifierFetchInfo';

const DEFAULT_COMPARISON_SETTINGS = {
  baselineTimeseriesId: '',
  shouldDisplayAbsoluteValues: true,
  shouldUseRelativePercentage: false,
};

const NO_FILTERS = 'No filters';
const OUTPUTS = 'Outputs';
const REGIONS = 'Regions';
const YEARS = 'Years';

const props = defineProps<{
  initialBreakdownState: BreakdownState;
  spatialAggregation: SpatialAggregation;
  aggregationMethod: AggregationOption;
  metadata: Model | Indicator;
}>();
const { spatialAggregation, metadata } = toRefs(props);
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply-breakdown-state', breakdownState: BreakdownState): void;
  (e: 'set-spatial-aggregation', newValue: SpatialAggregation): void;
}>();
const setSpatialAggregation = (newValue: SpatialAggregation) => {
  emit('set-spatial-aggregation', newValue);
};
const applyBreakdownState = () => {
  emit('apply-breakdown-state', breakdownState.value);
  emit('close');
};

const initialModelRunId = isBreakdownStateNone(props.initialBreakdownState)
  ? props.initialBreakdownState.modelRunIds[0]
  : props.initialBreakdownState.modelRunId;
const qualifiersWithData = useQualifierFetchInfo(
  metadata,
  ref([initialModelRunId]),
  ref(getDefaultFeature(metadata.value)?.name ?? '')
);
const qualifiers = computed(() =>
  (metadata.value.qualifier_outputs ?? [])
    .filter(isBreakdownQualifier)
    .filter((qualifier) => qualifiersWithData.value.has(qualifier.name))
);

const tabs = computed<RadioButtonSpec[]>(() => {
  const allTabs = [
    { value: NO_FILTERS, label: NO_FILTERS },
    { value: OUTPUTS, label: OUTPUTS, isDisabled: areTabsDisabled.value },
    { value: REGIONS, label: REGIONS, isDisabled: areTabsDisabled.value },
    { value: YEARS, label: YEARS, isDisabled: areTabsDisabled.value },
    ...qualifiers.value.map((qualifier) => ({
      value: qualifier.name,
      label: qualifier.display_name,
      isDisabled: areTabsDisabled.value,
    })),
  ];
  // All indicators and some models only have one output. In these cases, don't display the "split
  //  by output" tab.
  if (getValidatedOutputs(metadata.value.outputs).length === 1) {
    return allTabs.filter((tab) => tab.value !== OUTPUTS);
  }
  return allTabs;
});

const namesOfSplitByOptions = computed(() => {
  const options = [
    'regions',
    'years',
    ...qualifiers.value.map((qualifier) => qualifier.display_name + 's'),
  ];
  if (options.length === 2) {
    return options[0] + ' and ' + options[1];
  }
  options[options.length - 1] = 'and ' + options[options.length - 1];
  return options.join(', ');
});

const selectedTab = ref(NO_FILTERS);
const selectTab = (tab: string) => {
  selectedTab.value = tab;
};
const breakdownState = computed<BreakdownState>(() => {
  if (selectedTab.value === NO_FILTERS) return breakdownStateNone.value;
  if (selectedTab.value === OUTPUTS) return breakdownStateOutputs.value;
  if (selectedTab.value === REGIONS) return breakdownStateRegions.value;
  if (selectedTab.value === YEARS) return breakdownStateYears.value;
  return breakdownStatesQualifier.value[selectedTab.value];
});
const breakdownStateNone = ref<BreakdownStateNone>({
  outputName: getDefaultFeature(metadata.value)?.name ?? '',
  modelRunIds: [initialModelRunId],
  comparisonSettings: _.cloneDeep(DEFAULT_COMPARISON_SETTINGS),
});
const areTabsDisabled = computed(
  () => selectedTab.value === NO_FILTERS && breakdownStateNone.value.modelRunIds.length > 1
);
const breakdownStateOutputs = ref<BreakdownStateOutputs>({
  modelRunId: initialModelRunId,
  outputNames: [getDefaultFeature(metadata.value)?.name ?? ''],
  comparisonSettings: _.cloneDeep(DEFAULT_COMPARISON_SETTINGS),
});
const breakdownStateRegions = ref<BreakdownStateRegions>({
  modelRunId: initialModelRunId,
  outputName: getDefaultFeature(metadata.value)?.name ?? '',
  regionIds: [],
  comparisonSettings: _.cloneDeep(DEFAULT_COMPARISON_SETTINGS),
});
const breakdownStateYears = ref<BreakdownStateYears>({
  modelRunId: initialModelRunId,
  outputName: getDefaultFeature(metadata.value)?.name ?? '',
  regionId: null,
  years: [],
  isAllYearsReferenceTimeseriesShown: false,
  isSelectedYearsReferenceTimeseriesShown: false,
  comparisonSettings: _.cloneDeep(DEFAULT_COMPARISON_SETTINGS),
});
const breakdownStatesQualifier = ref<{ [qualifierName: string]: BreakdownStateQualifiers }>({});
watch(qualifiers, () => {
  // When qualifiers are fetched, initialize breakdown states for each one
  const defaultQualifierStates: { [qualifierName: string]: BreakdownStateQualifiers } = {};
  qualifiers.value.forEach((qualifier) => {
    defaultQualifierStates[qualifier.name] = {
      modelRunId: initialModelRunId,
      outputName: getDefaultFeature(metadata.value)?.name ?? '',
      regionId: null,
      qualifier: qualifier.name,
      qualifierValues: [],
      comparisonSettings: _.cloneDeep(DEFAULT_COMPARISON_SETTINGS),
    };
  });
  // Persist any qualifier state that's already in breakdownStatesQualifier.
  //  This occurs when "split by qualifier" is already active when the modal is opened.
  const qualifierStates = {
    ...defaultQualifierStates,
    ...breakdownStatesQualifier.value,
  };
  breakdownStatesQualifier.value = qualifierStates;
});
// Load the initial breakdown state into the selectedTab and relevant breakdownState ref.
onMounted(() => {
  const state = _.cloneDeep(props.initialBreakdownState);
  if (isBreakdownStateNone(state)) {
    breakdownStateNone.value = state;
    selectedTab.value = NO_FILTERS;
  } else if (isBreakdownStateOutputs(state)) {
    breakdownStateOutputs.value = state;
    selectedTab.value = OUTPUTS;
  } else if (isBreakdownStateRegions(state)) {
    breakdownStateRegions.value = state;
    selectedTab.value = REGIONS;
  } else if (isBreakdownStateYears(state)) {
    breakdownStateYears.value = state;
    selectedTab.value = YEARS;
  } else {
    breakdownStatesQualifier.value[state.qualifier] = state;
    selectedTab.value = state.qualifier;
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/common';
@import '@/styles/uncharted-design-tokens';

:deep(.radio-button-group button) {
  width: 100px;
}
</style>
