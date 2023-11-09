<template>
  <div class="years-tab-container tab-content">
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
        <p>Years</p>
        <div class="row-with-description">
          <dropdown-button
            class="fixed-width-input"
            :items="yearDropdownOptions"
            :selected-item="breakdownState.years[0]"
            @item-selected="(year: string) => (breakdownState.years[0] = year)"
          />
        </div>
      </div>
      <div v-for="(year, i) of breakdownState.years.slice(1)" :key="i" class="labelled-row">
        <!-- Empty div to align the button with the inputs above it -->
        <div></div>
        <div class="removable-row fixed-width-input">
          <dropdown-button
            :items="yearDropdownOptions"
            :selected-item="year"
            @item-selected="(year: string) => (breakdownState.years[i + 1] = year)"
            class="fixed-width-input"
          />
          <button type="button" class="btn btn-default icon-button" @click="removeYear(i + 1)">
            <i class="fa fa-fw fa-minus" />
          </button>
        </div>
      </div>
      <div class="labelled-row">
        <!-- Empty div to align the button with the inputs above it -->
        <div></div>
        <button class="btn btn-default fixed-width-input" @click="addYear">
          <i class="fa fa-fw fa-plus" />Compare with another year
        </button>
      </div>
    </section>

    <comparison-settings-vue
      v-if="breakdownState.years.length > 1"
      :comparison-baseline-options="comparisonBaselineOptions"
      :comparison-settings="breakdownState.comparisonSettings"
      @set-comparison-settings="setComparisonSettings"
    />
  </div>
</template>

<script setup lang="ts">
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import { BreakdownStateYears, ComparisonSettings, Indicator, Model } from '@/types/Datacube';
import { AggregationOption, SpatialAggregation } from '@/types/Enums';
import { getOutputDescription } from '@/utils/datacube-util';
import { computed, toRefs, watch } from 'vue';
import ComparisonSettingsVue from './comparison-settings.vue';
import { useAvailableRegions } from '@/composables/useAvailableRegions';
import { useAvailableYears } from '@/composables/useAvailableYears';
import { useRegionalDropdownOptions } from '@/composables/useRegionalDropdownOptions';

const props = defineProps<{
  breakdownState: BreakdownStateYears;
  metadata: Model | Indicator;
  spatialAggregation: SpatialAggregation;
  aggregationMethod: AggregationOption;
}>();
const { breakdownState, metadata, spatialAggregation } = toRefs(props);
const emit = defineEmits<{
  (e: 'set-breakdown-state', breakdownState: BreakdownStateYears): void;
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
  {
    value: null,
    displayName: `${
      props.aggregationMethod === AggregationOption.Mean ? 'Average' : 'Sum'
    } of all regions`,
  },
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
  const newState: BreakdownStateYears = {
    ...breakdownState.value,
    regionId: null,
  };
  emit('set-breakdown-state', newState);
});

const { availableYears } = useAvailableYears(metadata, breakdownState);

const yearDropdownOptions = computed<DropdownItem[]>(
  () => availableYears.value?.map((year) => ({ value: year, displayName: year })) ?? []
);
watch([availableYears], () => {
  const _availableYears = availableYears.value;
  // When the available years change, ensure the selected years are found among them,
  //  and ensure at least one year is selected
  if (_availableYears === null || _availableYears.length === 0) {
    return;
  }
  const validYears = breakdownState.value.years.filter((year) => _availableYears.includes(year));
  const newSelectedYears = validYears.length === 0 ? [_availableYears[0]] : validYears;
  const newState: BreakdownStateYears = {
    ...breakdownState.value,
    years: newSelectedYears,
  };
  emit('set-breakdown-state', newState);
});

const addYear = () => {
  const newState: BreakdownStateYears = {
    ...breakdownState.value,
    years: [...breakdownState.value.years, yearDropdownOptions.value[0].value],
  };
  emit('set-breakdown-state', newState);
};
const removeYear = (positionInSelectedYearsList: number) => {
  const newState: BreakdownStateYears = {
    ...breakdownState.value,
    years: [...breakdownState.value.years.filter((_, i) => i !== positionInSelectedYearsList)],
  };
  emit('set-breakdown-state', newState);
};

const comparisonBaselineOptions = computed<DropdownItem[]>(() =>
  breakdownState.value.years.map((year) => ({
    value: year,
    displayName: year,
  }))
);
const setComparisonSettings = (newComparisonSettings: ComparisonSettings) => {
  const newState: BreakdownStateYears = {
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
