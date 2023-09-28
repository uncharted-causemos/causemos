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

      <template v-if="selectedTabValue === NO_FILTERS">
        <p v-if="areTabsDisabled" class="subdued un-font-small">
          No more than one model run may be selected to filter and compare
          {{ namesOfSplitByOptions }}.
        </p>
        <p>Aggregated data from all {{ namesOfSplitByOptions }} will be displayed.</p>
      </template>

      <template v-else-if="selectedTabValue === OUTPUTS">
        <p class="subdued un-font-small">
          Some models produce multiple outputs with each run. Select one or more of them here.
        </p>
        <dropdown-button
          :items="outputDropdownOptions"
          :selected-item="(breakdownState as BreakdownStateOutputs).outputNames[0]"
          @item-selected="outputName => (breakdownState as BreakdownStateOutputs).outputNames[0] = outputName"
        />
        <p class="subdued un-font-small">
          {{ getOutputDescription((breakdownState as BreakdownStateOutputs).outputNames[0]) }}
        </p>

        <div
          v-for="(outputName, i) of (breakdownState as BreakdownStateOutputs).outputNames.slice(1)"
          :key="i"
        >
          <dropdown-button
            :items="outputDropdownOptions"
            :selected-item="outputName"
            @item-selected="outputName => (breakdownState as BreakdownStateOutputs).outputNames[i + 1] = outputName"
          />
          <button type="button" class="btn btn-default" @click="removeOutput(i + 1)">
            <i class="fa fa-fw fa-minus" />
          </button>
          <p class="subdued un-font-small">
            {{ getOutputDescription((breakdownState as BreakdownStateOutputs).outputNames[i + 1]) }}
          </p>
        </div>
        <button class="btn btn-default" @click="addOutput">
          <i class="fa fa-fw fa-plus" />Compare with another output
        </button>

        <div
          v-if="(breakdownState as BreakdownStateOutputs).outputNames.length > 1"
          class="comparison-settings-container"
        >
          <p>Comparison settings</p>
          <label
            ><input
              type="radio"
              name="display-absolute-values"
              :checked="breakdownState.comparisonSettings.shouldDisplayAbsoluteValues === true"
              @input="setComparisonSettings(true)"
            />
            Display absolute values</label
          >
          <label
            ><input
              type="radio"
              name="display-absolute-values"
              :checked="breakdownState.comparisonSettings.shouldDisplayAbsoluteValues === false"
              @input="setComparisonSettings(false)"
            />
            Display values relative to</label
          >
          <dropdown-button
            :items="comparisonBaselineOptions"
            :selected-item="breakdownState.comparisonSettings.baselineTimeseriesId"
            @item-selected="
              (positionInSelectedOutputsList) =>
                setComparisonSettings(
                  false,
                  positionInSelectedOutputsList,
                  breakdownState.comparisonSettings.shouldUseRelativePercentage
                )
            "
          />
        </div>
      </template>

      <template v-else-if="selectedTabValue === REGIONS">
        <p>Output</p>
        <dropdown-button
          :items="outputDropdownOptions"
          :selected-item="(breakdownState as BreakdownStateRegions).outputName"
          @item-selected="outputName => (breakdownState as BreakdownStateRegions).outputName = outputName"
        />
        <p class="subdued un-font-small">
          {{ getOutputDescription((breakdownState as BreakdownStateRegions).outputName) }}
        </p>
        <p>Spatial resolution</p>
        <button class="btn btn-default">TODO SPATIAL RESOLUTIONS</button>
        <p>Regions</p>
        <button class="btn btn-default">TODO REGIONS</button>
        <button class="btn btn-default"><i class="fa fa-plus" />Compare with another region</button>
      </template>

      <template v-else-if="selectedTabValue === YEARS"> Years </template>

      <template v-else>
        {{ selectedTabValue }}
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
import { computed, ref, toRefs } from 'vue';
import RadioButtonGroup, { RadioButtonSpec } from '../widgets/radio-button-group.vue';
import {
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';
import DropdownButton, { DropdownItem } from '../dropdown-button.vue';

const NO_FILTERS = 'No filters';
const OUTPUTS = 'Outputs';
const REGIONS = 'Regions';
const YEARS = 'Years';

const props = defineProps<{
  initialBreakdownState: BreakdownState;
  qualifiers: FeatureQualifier[];
  outputs: DatacubeFeature[];
}>();

const { qualifiers, outputs } = toRefs(props);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply-breakdown-state', breakdownState: BreakdownState): void;
}>();

const breakdownState = ref(props.initialBreakdownState);
const applyBreakdownState = () => {
  emit('apply-breakdown-state', breakdownState.value);
};

const areTabsDisabled = computed(
  () => isBreakdownStateNone(breakdownState.value) && breakdownState.value.modelRunIds.length > 1
);

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
      outputName: 'data',
      modelRunIds: [],
      comparisonSettings: {
        baselineTimeseriesId: '',
        shouldDisplayAbsoluteValues: true,
        shouldUseRelativePercentage: false,
      },
    };
    breakdownState.value = newState;
  } else if (tab === OUTPUTS) {
    const newState: BreakdownStateOutputs = {
      modelRunId: '',
      outputNames: ['min'],
      comparisonSettings: {
        baselineTimeseriesId: '',
        shouldDisplayAbsoluteValues: true,
        shouldUseRelativePercentage: false,
      },
    };
    breakdownState.value = newState;
  } else if (tab === REGIONS) {
    const newState: BreakdownStateRegions = {
      modelRunId: '',
      outputName: 'data',
      regionIds: [],
      comparisonSettings: {
        baselineTimeseriesId: '',
        shouldDisplayAbsoluteValues: true,
        shouldUseRelativePercentage: false,
      },
    };
    breakdownState.value = newState;
  } else if (tab === YEARS) {
    const newState: BreakdownStateYears = {
      modelRunId: '',
      outputName: 'data',
      regionId: null,
      years: [],
      isAllYearsReferenceTimeseriesShown: false,
      isSelectedYearsReferenceTimeseriesShown: false,
      comparisonSettings: {
        baselineTimeseriesId: '',
        shouldDisplayAbsoluteValues: true,
        shouldUseRelativePercentage: false,
      },
    };
    breakdownState.value = newState;
  } else {
    const newState: BreakdownStateQualifiers = {
      modelRunId: '',
      outputName: 'data',
      regionId: null,
      qualifier: tab,
      qualifierValues: [],
      comparisonSettings: {
        baselineTimeseriesId: '',
        shouldDisplayAbsoluteValues: true,
        shouldUseRelativePercentage: false,
      },
    };
    breakdownState.value = newState;
  }
};

const outputDropdownOptions = computed<DropdownItem[]>(() =>
  outputs.value.map((output) => ({
    displayName: output.display_name,
    value: output.name,
  }))
);
const getOutputDescription = (outputName: string) =>
  outputs.value.find((output) => output.name === outputName)?.description ?? '';
const addOutput = () => {
  if (!isBreakdownStateOutputs(breakdownState.value)) {
    return;
  }
  const newState: BreakdownStateOutputs = {
    ...breakdownState.value,
    outputNames: [...breakdownState.value.outputNames, outputDropdownOptions.value[0].value],
  };
  breakdownState.value = newState;
};
const removeOutput = (positionInSelectedOutputsList: number) => {
  if (!isBreakdownStateOutputs(breakdownState.value)) {
    return;
  }
  const newState: BreakdownStateOutputs = {
    ...breakdownState.value,
    outputNames: [
      ...breakdownState.value.outputNames.filter((_, i) => i !== positionInSelectedOutputsList),
    ],
  };
  breakdownState.value = newState;
};
const comparisonBaselineOptions = computed<DropdownItem[]>(() =>
  (breakdownState.value as BreakdownStateOutputs).outputNames.map((outputName) => ({
    value: outputName,
    displayName:
      outputs.value.find((output) => output.name === outputName)?.display_name ?? outputName,
  }))
);

const setComparisonSettings = (
  shouldDisplayAbsoluteValues: boolean,
  baselineTimeseriesId?: string,
  shouldUseRelativePercentage?: boolean
) => {
  // TODO: shouldn't assume we're looking at outputs
  // Only update baselineTimeseriesId and shouldUseRelativePercentage if optional parameters are defined
  const definedBaselineTimeseriesId =
    baselineTimeseriesId ?? (breakdownState.value as BreakdownStateOutputs).outputNames[0];
  const definedShouldUseRelativePercentage =
    shouldUseRelativePercentage !== undefined
      ? shouldDisplayAbsoluteValues
      : breakdownState.value.comparisonSettings.shouldUseRelativePercentage;

  const newState: BreakdownState = {
    ...breakdownState.value,
    comparisonSettings: {
      shouldDisplayAbsoluteValues,
      baselineTimeseriesId: definedBaselineTimeseriesId,
      shouldUseRelativePercentage: definedShouldUseRelativePercentage,
    },
  };
  breakdownState.value = newState;
};
</script>

<style lang="scss" scoped>
@import '@/styles/common';

.radio-button-group {
  margin-bottom: 40px;
}
:deep(.radio-button-group button) {
  width: 100px;
}
</style>
