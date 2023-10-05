<template>
  <Modal>
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
        :outputs="outputs"
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

      <template v-else-if="selectedTab === YEARS"> Years </template>

      <template v-else>
        {{ selectedTab }}
      </template>
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
import { computed, onMounted, ref, toRefs } from 'vue';
import RadioButtonGroup, { RadioButtonSpec } from '../widgets/radio-button-group.vue';
import {
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';
import { DatacubeGeoAttributeVariableType } from '@/types/Enums';
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
  spatialAggregation: DatacubeGeoAttributeVariableType | 'tiles';
  metadata: Model | Indicator;
}>();

const { spatialAggregation, metadata } = toRefs(props);

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
const outputs = computed(() => metadata.value.outputs);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply-breakdown-state', breakdownState: BreakdownState): void;
  (e: 'set-spatial-aggregation', newValue: DatacubeGeoAttributeVariableType | 'tiles'): void;
}>();
const setSpatialAggregation = (newValue: DatacubeGeoAttributeVariableType | 'tiles') => {
  emit('set-spatial-aggregation', newValue);
};

const applyBreakdownState = () => {
  emit('apply-breakdown-state', breakdownState.value);
  emit('close');
};

const tabs = computed<RadioButtonSpec[]>(() => {
  return [
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
onMounted(() => {
  const qualifierStates: { [qualifierName: string]: BreakdownStateQualifiers } = {};
  qualifiers.value.forEach((qualifier) => {
    qualifierStates[qualifier.name] = {
      modelRunId: initialModelRunId,
      outputName: getDefaultFeature(metadata.value)?.name ?? '',
      regionId: null,
      qualifier: qualifier.name,
      qualifierValues: [],
      comparisonSettings: _.cloneDeep(DEFAULT_COMPARISON_SETTINGS),
    };
  });
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
