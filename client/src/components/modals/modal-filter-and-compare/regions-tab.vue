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

    <comparison-settings-vue
      v-if="breakdownState.regionIds.length > 1"
      :comparison-baseline-options="comparisonBaselineOptions"
      :comparison-settings="breakdownState.comparisonSettings"
      @set-comparison-settings="setComparisonSettings"
    />
  </div>
</template>

<script setup lang="ts">
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import { getRegionLists } from '@/services/outputdata-service';
import { DatacubeGeography } from '@/types/Common';
import { BreakdownStateRegions, ComparisonSettings, Indicator, Model } from '@/types/Datacube';
import { AdminLevel, DatacubeGeoAttributeVariableType } from '@/types/Enums';
import { ADMIN_LEVEL_TITLES, getRegionIdDisplayName } from '@/utils/admin-level-util';
import { getOutputDescription } from '@/utils/datacube-util';
import { computed, ref, toRefs, watch } from 'vue';
import ComparisonSettingsVue from './comparison-settings.vue';

const POSSIBLE_SPATIAL_RESOLUTION_DROPDOWN_OPTIONS: DropdownItem[] = [
  { value: AdminLevel.Country, displayName: ADMIN_LEVEL_TITLES[AdminLevel.Country] },
  { value: AdminLevel.Admin1, displayName: ADMIN_LEVEL_TITLES[AdminLevel.Admin1] },
  { value: AdminLevel.Admin2, displayName: ADMIN_LEVEL_TITLES[AdminLevel.Admin2] },
  { value: AdminLevel.Admin3, displayName: ADMIN_LEVEL_TITLES[AdminLevel.Admin3] },
  { value: 'tiles', displayName: 'Tiles' },
];

const props = defineProps<{
  breakdownState: BreakdownStateRegions;
  metadata: Model | Indicator;
  spatialAggregation: DatacubeGeoAttributeVariableType | 'tiles';
}>();
const { breakdownState, metadata, spatialAggregation } = toRefs(props);
const emit = defineEmits<{
  (e: 'set-breakdown-state', breakdownState: BreakdownStateRegions): void;
  (e: 'set-spatial-aggregation', newValue: DatacubeGeoAttributeVariableType | 'tiles'): void;
}>();
const outputs = computed(() => metadata.value.outputs);
const outputDropdownOptions = computed<DropdownItem[]>(() =>
  outputs.value.map((output) => ({
    displayName: output.display_name,
    value: output.name,
  }))
);

const availableRegions = ref<DatacubeGeography | null>(null);
watch(
  [() => breakdownState.value.modelRunId, () => breakdownState.value.outputName, metadata],
  async () => {
    const result = await getRegionLists(
      metadata.value.data_id,
      [breakdownState.value.modelRunId], // TODO: if indicator, return 'indicator'
      breakdownState.value.outputName
    );
    // Sort each list alphabetically
    Object.values(result).forEach((regions) => {
      regions.sort();
    });
    availableRegions.value = result;
  },
  { immediate: true }
);

const setSpatialAggregation = (newValue: DatacubeGeoAttributeVariableType | 'tiles') => {
  emit('set-spatial-aggregation', newValue);
};
const spatialAggregationDropdownOptions = computed(() => {
  // If available spatial resolutions haven't been fetched yet, only show the currently selected one
  //  in the dropdown.
  const _availableRegions = availableRegions.value;
  if (_availableRegions === null) {
    return [
      POSSIBLE_SPATIAL_RESOLUTION_DROPDOWN_OPTIONS.find(
        (option) => option.value === spatialAggregation.value
      ) ?? POSSIBLE_SPATIAL_RESOLUTION_DROPDOWN_OPTIONS[0],
    ];
  }
  // Filter out any admin levels that have no available regions at that level.
  return POSSIBLE_SPATIAL_RESOLUTION_DROPDOWN_OPTIONS.filter(
    (option) =>
      option.value === 'tiles' ||
      (_availableRegions[option.value as DatacubeGeoAttributeVariableType] as string[]).length !== 0
  );
});

const regionsDropdownOptions = computed<DropdownItem[]>(() => {
  if (availableRegions.value === null || spatialAggregation.value === 'tiles') {
    return [];
  }
  return availableRegions.value[spatialAggregation.value].map((region) => {
    return { value: region, displayName: getRegionIdDisplayName(region) };
  });
});
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
  const newState: BreakdownStateRegions = {
    ...breakdownState.value,
    comparisonSettings: newComparisonSettings,
  };
  emit('set-breakdown-state', newState);
};
</script>

<style lang="scss" scoped>
@import '@/styles/common';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/modal-filter-and-compare';
.regions-tab-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
