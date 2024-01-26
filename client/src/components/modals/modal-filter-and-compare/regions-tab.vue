<template>
  <div class="regions-tab-container tab-content">
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
    </section>

    <section>
      <div class="labelled-row">
        <p>Regions</p>
        <dropdown-button
          class="fixed-width-input"
          :items="regionsDropdownOptions"
          :selected-item="breakdownState.regionIds[0]"
          @item-selected="(regionId) => (breakdownState.regionIds[0] = regionId)"
        />
      </div>
      <div v-for="(regionId, i) of breakdownState.regionIds.slice(1)" :key="i" class="labelled-row">
        <!-- Empty div to align the button with the inputs above it -->
        <div></div>
        <div class="removable-row fixed-width-input">
          <dropdown-button
            :items="regionsDropdownOptions"
            :selected-item="regionId"
            @item-selected="(regionId: string) => (breakdownState.regionIds[i + 1] = regionId)"
            class="fixed-width-input"
          />
          <button type="button" class="btn btn-default icon-button" @click="removeRegion(i + 1)">
            <i class="fa fa-fw fa-minus" />
          </button>
        </div>
      </div>
      <div class="labelled-row">
        <!-- Empty div to align the button with the inputs above it -->
        <div></div>
        <button class="btn btn-default fixed-width-input" @click="addRegion">
          <i class="fa fa-fw fa-plus" />Compare with another region
        </button>
      </div>
    </section>

    <ComparisonSettingsVue
      v-if="breakdownState.regionIds.length > 1"
      :comparison-baseline-options="comparisonBaselineOptions"
      :comparison-settings="breakdownState.comparisonSettings"
      :unit="unit"
      @set-comparison-settings="setComparisonSettings"
    />
  </div>
</template>

<script setup lang="ts">
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import { BreakdownStateRegions, ComparisonSettings, Indicator, Model } from '@/types/Datacube';
import { SpatialAggregation } from '@/types/Enums';
import { getRegionIdDisplayName } from '@/utils/admin-level-util';
import { ensureBaselineFoundInTimeseriesIds, getOutputDescription } from '@/utils/datacube-util';
import { computed, toRefs, watch } from 'vue';
import ComparisonSettingsVue from './comparison-settings.vue';
import { useAvailableRegions } from '@/composables/useAvailableRegions';
import { useRegionalDropdownOptions } from '@/composables/useRegionalDropdownOptions';

const props = defineProps<{
  breakdownState: BreakdownStateRegions;
  metadata: Model | Indicator;
  spatialAggregation: SpatialAggregation;
}>();
const { breakdownState, metadata, spatialAggregation } = toRefs(props);
const emit = defineEmits<{
  (e: 'set-breakdown-state', breakdownState: BreakdownStateRegions): void;
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
const { spatialAggregationDropdownOptions, regionsDropdownOptions } = useRegionalDropdownOptions(
  availableRegions,
  spatialAggregation
);

const setSpatialAggregation = (newValue: SpatialAggregation) => {
  emit('set-spatial-aggregation', newValue);
};

watch([spatialAggregation, availableRegions], () => {
  // When the selected admin level changes, ensure the selected regions are found at that level
  if (
    availableRegions.value === null ||
    spatialAggregation.value === 'tiles' ||
    availableRegions.value[spatialAggregation.value].length === 0 ||
    availableRegions.value[spatialAggregation.value].includes(breakdownState.value.regionIds[0])
  ) {
    return;
  }
  const firstRegionAtSpatialAggregationLevel = availableRegions.value[spatialAggregation.value][0];
  const newState: BreakdownStateRegions = {
    ...breakdownState.value,
    regionIds: [firstRegionAtSpatialAggregationLevel],
  };
  emit('set-breakdown-state', newState);
});

const addRegion = () => {
  const newState: BreakdownStateRegions = {
    ...breakdownState.value,
    regionIds: [...breakdownState.value.regionIds, regionsDropdownOptions.value[0].value],
  };
  emit('set-breakdown-state', newState);
};
const removeRegion = (positionInSelectedRegionsList: number) => {
  const newState: BreakdownStateRegions = {
    ...breakdownState.value,
    regionIds: [
      ...breakdownState.value.regionIds.filter((_, i) => i !== positionInSelectedRegionsList),
    ],
  };
  emit('set-breakdown-state', newState);
};

const comparisonBaselineOptions = computed<DropdownItem[]>(() =>
  breakdownState.value.regionIds.map((regionId) => ({
    value: regionId,
    displayName: getRegionIdDisplayName(regionId),
  }))
);

const setComparisonSettings = (newComparisonSettings: ComparisonSettings) => {
  const validatedComparisonSettings = ensureBaselineFoundInTimeseriesIds(
    newComparisonSettings,
    breakdownState.value.regionIds
  );
  const newState: BreakdownStateRegions = {
    ...breakdownState.value,
    comparisonSettings: validatedComparisonSettings,
  };
  emit('set-breakdown-state', newState);
};
watch(breakdownState, () => {
  const validatedComparisonSettings = ensureBaselineFoundInTimeseriesIds(
    breakdownState.value.comparisonSettings,
    breakdownState.value.regionIds
  );
  if (validatedComparisonSettings === breakdownState.value.comparisonSettings) {
    // Baseline was already found in region IDs
    return;
  }
  const newState: BreakdownStateRegions = {
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
@import '@/styles/common';
@import '@/styles/modal-filter-and-compare';
</style>
