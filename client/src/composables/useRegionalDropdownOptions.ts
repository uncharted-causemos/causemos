import { DropdownItem } from '@/components/dropdown-button.vue';
import { DatacubeGeography } from '@/types/Common';
import { AdminLevel, DatacubeGeoAttributeVariableType, SpatialAggregation } from '@/types/Enums';
import { ADMIN_LEVEL_TITLES, getRegionIdDisplayName } from '@/utils/admin-level-util';
import { Ref, computed } from 'vue';

export const POSSIBLE_SPATIAL_RESOLUTION_DROPDOWN_OPTIONS: DropdownItem[] = [
  { value: AdminLevel.Country, displayName: ADMIN_LEVEL_TITLES[AdminLevel.Country] },
  { value: AdminLevel.Admin1, displayName: ADMIN_LEVEL_TITLES[AdminLevel.Admin1] },
  { value: AdminLevel.Admin2, displayName: ADMIN_LEVEL_TITLES[AdminLevel.Admin2] },
  { value: AdminLevel.Admin3, displayName: ADMIN_LEVEL_TITLES[AdminLevel.Admin3] },
  { value: 'tiles', displayName: 'Tiles' },
];

export function useRegionalDropdownOptions(
  availableRegions: Ref<DatacubeGeography | null>,
  spatialAggregation: Ref<SpatialAggregation>
) {
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
        (_availableRegions[option.value as DatacubeGeoAttributeVariableType] as string[]).length !==
          0
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

  return {
    spatialAggregationDropdownOptions,
    regionsDropdownOptions,
  };
}
