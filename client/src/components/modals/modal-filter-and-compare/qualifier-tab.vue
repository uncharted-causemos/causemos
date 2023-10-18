<template>
  <div class="qualifier-tab-container tab-content">
    <section>
      <div class="labelled-row">
        <p>Output</p>
        <div class="row-with-description">
          <dropdown-button
            class="fixed-width-input"
            :items="outputDropdownOptions"
            :selected-item="breakdownState.outputName"
            @item-selected="(outputName: string) => (breakdownState.outputName = outputName)"
          />
          <p class="subdued un-font-small">
            {{ getOutputDescription(outputs, breakdownState.outputName) }}
          </p>
        </div>
      </div>

      <div class="labelled-row">
        <p>Spatial resolution</p>
        <dropdown-button
          class="fixed-width-input"
          :items="spatialAggregationDropdownOptions"
          :selected-item="spatialAggregation"
          @item-selected="setSpatialAggregation"
        />
      </div>

      <div class="labelled-row">
        <p>Region</p>
        <dropdown-button
          class="fixed-width-input"
          :items="regionsDropdownOptions"
          :selected-item="breakdownState.regionId"
          @item-selected="(regionId) => (breakdownState.regionId = regionId)"
        />
      </div>
    </section>

    <section>
      <div class="labelled-row">
        <p>{{ qualifierDisplayName }}s</p>
        <div class="row-with-description">
          <dropdown-button
            class="fixed-width-input"
            :items="qualifierValueDropdownOptions"
            :selected-item="breakdownState.qualifierValues[0]"
            @item-selected="(newValue: string) => (breakdownState.qualifierValues[0] = newValue)"
          />
        </div>
      </div>
      <div
        v-for="(qualifierValue, i) of breakdownState.qualifierValues.slice(1)"
        :key="i"
        class="labelled-row"
      >
        <!-- Empty div to align the button with the inputs above it -->
        <div></div>
        <div class="removable-row fixed-width-input">
          <dropdown-button
            :items="qualifierValueDropdownOptions"
            :selected-item="qualifierValue"
            @item-selected="(qualifierValue: string) => (breakdownState.qualifierValues[i + 1] = qualifierValue)"
            class="fixed-width-input"
          />
          <button
            type="button"
            class="btn btn-default icon-button"
            @click="removeQualifierValue(i + 1)"
          >
            <i class="fa fa-fw fa-minus" />
          </button>
        </div>
      </div>
      <div class="labelled-row">
        <!-- Empty div to align the button with the inputs above it -->
        <div></div>
        <button class="btn btn-default fixed-width-input" @click="addQualifierValue">
          <i class="fa fa-fw fa-plus" />Compare with another {{ qualifierDisplayName }}
        </button>
      </div>
    </section>

    <comparison-settings-vue
      v-if="breakdownState.qualifierValues.length > 1"
      :comparison-baseline-options="comparisonBaselineOptions"
      :comparison-settings="breakdownState.comparisonSettings"
      @set-comparison-settings="setComparisonSettings"
    />
  </div>
</template>

<script setup lang="ts">
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import ComparisonSettingsVue from './comparison-settings.vue';
import { useAvailableRegions } from '@/composables/useAvailableRegions';
import { useRegionalDropdownOptions } from '@/composables/useRegionalDropdownOptions';
import { getDefaultDataConfig, getDefaultFeature } from '@/services/datacube-service';
import { getQualifierBreakdown } from '@/services/outputdata-service';
import { BreakdownStateQualifiers, ComparisonSettings, Indicator, Model } from '@/types/Datacube';
import { AggregationOption, SpatialAggregation, TemporalResolutionOption } from '@/types/Enums';
import { getOutputDescription } from '@/utils/datacube-util';
import { computed, ref, toRefs, watch } from 'vue';

const props = defineProps<{
  breakdownState: BreakdownStateQualifiers;
  metadata: Model | Indicator;
  spatialAggregation: SpatialAggregation;
  qualifierDisplayName: string;
}>();
const { breakdownState, metadata, spatialAggregation } = toRefs(props);
const emit = defineEmits<{
  (e: 'set-breakdown-state', breakdownState: BreakdownStateQualifiers): void;
  (e: 'set-spatial-aggregation', newValue: SpatialAggregation): void;
}>();
const outputs = computed(() => metadata.value.outputs);
const outputDropdownOptions = computed<DropdownItem[]>(() =>
  outputs.value.map((output) => ({
    displayName: output.display_name,
    value: output.name,
  }))
);

const { availableRegions } = useAvailableRegions(metadata, breakdownState);
const {
  spatialAggregationDropdownOptions,
  regionsDropdownOptions: incompleteRegionsDropdownOptions,
} = useRegionalDropdownOptions(availableRegions, spatialAggregation);
const regionsDropdownOptions = computed<DropdownItem[]>(() => [
  // TODO: display 'sum' or 'average' depending on the selected aggregation type
  { value: null, displayName: 'Sum of all regions' },
  ...incompleteRegionsDropdownOptions.value,
]);

const setSpatialAggregation = (newValue: SpatialAggregation) => {
  emit('set-spatial-aggregation', newValue);
};

watch([spatialAggregation, availableRegions], () => {
  // When the selected admin level changes, ensure the selected region is found at that level
  if (
    availableRegions.value === null ||
    spatialAggregation.value === 'tiles' ||
    availableRegions.value[spatialAggregation.value].length === 0 ||
    breakdownState.value.regionId === null ||
    availableRegions.value[spatialAggregation.value].includes(breakdownState.value.regionId)
  ) {
    return;
  }
  const newState: BreakdownStateQualifiers = {
    ...breakdownState.value,
    regionId: null,
  };
  emit('set-breakdown-state', newState);
});

const availableQualifierValues = ref<string[] | null>(null);
watch(
  [
    metadata,
    () => breakdownState.value.modelRunId,
    () => breakdownState.value.qualifier,
    () => breakdownState.value.regionId,
  ],
  async () => {
    const outputName = getDefaultFeature(metadata.value)?.name ?? '';
    const lastTimestamp = (
      await getDefaultDataConfig(
        metadata.value.data_id,
        outputName,
        breakdownState.value.modelRunId
      )
    ).selectedTimestamp;
    const result = await getQualifierBreakdown(
      metadata.value.data_id,
      breakdownState.value.modelRunId,
      outputName,
      [breakdownState.value.qualifier],
      TemporalResolutionOption.Year,
      AggregationOption.Mean,
      AggregationOption.Mean,
      lastTimestamp,
      breakdownState.value.regionId ?? ''
    );
    availableQualifierValues.value = result[0].options.map(({ name }) => name);
  },
  { immediate: true }
);

const qualifierValueDropdownOptions = computed<DropdownItem[]>(() =>
  availableQualifierValues.value === null
    ? []
    : availableQualifierValues.value.map((value) => ({ value, displayName: value }))
);
watch([availableQualifierValues], () => {
  const _availableQualifierValues = availableQualifierValues.value;
  // When the available values change, ensure the selected values are found among them,
  //  and ensure at least one value is selected
  if (_availableQualifierValues === null || _availableQualifierValues.length === 0) {
    return;
  }
  const validValues = breakdownState.value.qualifierValues.filter((value) =>
    _availableQualifierValues.includes(value)
  );
  const newSelectedValues = validValues.length === 0 ? [_availableQualifierValues[0]] : validValues;
  const newState: BreakdownStateQualifiers = {
    ...breakdownState.value,
    qualifierValues: newSelectedValues,
  };
  emit('set-breakdown-state', newState);
});

const addQualifierValue = () => {
  const newState: BreakdownStateQualifiers = {
    ...breakdownState.value,
    qualifierValues: [
      ...breakdownState.value.qualifierValues,
      qualifierValueDropdownOptions.value[0].value,
    ],
  };
  emit('set-breakdown-state', newState);
};
const removeQualifierValue = (positionInSelectedValuesList: number) => {
  const newState: BreakdownStateQualifiers = {
    ...breakdownState.value,
    qualifierValues: [
      ...breakdownState.value.qualifierValues.filter((_, i) => i !== positionInSelectedValuesList),
    ],
  };
  emit('set-breakdown-state', newState);
};

const comparisonBaselineOptions = computed<DropdownItem[]>(() =>
  breakdownState.value.qualifierValues.map((qualifierValue) => ({
    value: qualifierValue,
    displayName: qualifierValue,
  }))
);
const setComparisonSettings = (newComparisonSettings: ComparisonSettings) => {
  const newState: BreakdownStateQualifiers = {
    ...breakdownState.value,
    comparisonSettings: newComparisonSettings,
  };
  emit('set-breakdown-state', newState);
};
</script>

<style lang="scss" scoped>
@import '@/styles/common';
@import '@/styles/modal-filter-and-compare';
</style>
