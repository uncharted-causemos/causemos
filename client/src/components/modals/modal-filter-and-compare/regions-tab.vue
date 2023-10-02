<template>
  <div class="regions-tab-container">
    <p>Output</p>
    <dropdown-button
      :items="outputDropdownOptions"
      :selected-item="breakdownState.outputName"
      @item-selected="(outputName: string) => (breakdownState.outputName = outputName)"
    />
    <p class="subdued un-font-small">
      {{ getOutputDescription(outputs, breakdownState.outputName) }}
    </p>
    <p>Spatial resolution</p>

    <dropdown-button
      :items="spatialAggregationDropdownOptions"
      :selected-item="spatialAggregation"
      @item-selected="setSpatialAggregation"
    />
    <p>Regions</p>
    <button class="btn btn-default">TODO REGIONS</button>
    <button class="btn btn-default"><i class="fa fa-plus" />Compare with another region</button>
  </div>
</template>

<script setup lang="ts">
import DropdownButton, { DropdownItem } from '@/components/dropdown-button.vue';
import { getRegionLists } from '@/services/outputdata-service';
import { BreakdownStateRegions, Indicator, Model } from '@/types/Datacube';
import { AdminLevel } from '@/types/Enums';
import { ADMIN_LEVEL_TITLES } from '@/utils/admin-level-util';
import { getOutputDescription } from '@/utils/datacube-util';
import { computed, ref, toRefs, watch } from 'vue';

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
  spatialAggregation: AdminLevel | 'tiles';
}>();
const { breakdownState, metadata, spatialAggregation } = toRefs(props);
const emit = defineEmits<{
  (e: 'set-breakdown-state', breakdownState: BreakdownStateRegions): void;
  (e: 'set-spatial-aggregation', newValue: AdminLevel | 'tiles'): void;
}>();
const outputs = computed(() => metadata.value.outputs);
const outputDropdownOptions = computed<DropdownItem[]>(() =>
  outputs.value.map((output) => ({
    displayName: output.display_name,
    value: output.name,
  }))
);

const setSpatialAggregation = (newValue: AdminLevel | 'tiles') => {
  emit('set-spatial-aggregation', newValue);
};
// If available spatial resolutions haven't been fetched yet, only show the currently selected one
//  in the dropdown.
const spatialAggregationDropdownOptions = ref([
  POSSIBLE_SPATIAL_RESOLUTION_DROPDOWN_OPTIONS.find(
    (option) => option.value === spatialAggregation.value
  ) ?? POSSIBLE_SPATIAL_RESOLUTION_DROPDOWN_OPTIONS[0],
]);
watch(
  [breakdownState, metadata],
  async () => {
    const result = await getRegionLists(
      metadata.value.data_id,
      [breakdownState.value.modelRunId], // TODO: if indicator, return 'indicator'
      breakdownState.value.outputName
    );
    spatialAggregationDropdownOptions.value = POSSIBLE_SPATIAL_RESOLUTION_DROPDOWN_OPTIONS.filter(
      (option) => option.value === 'tiles' || result[option.value].length !== 0
    );
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/modal-filter-and-compare';
.regions-tab-container {
  display: flex;
  flex-direction: column;
  gap: 40px;
}
</style>
