import _ from 'lodash';
import { Ref, computed } from 'vue';
import { AdminRegionSets } from '@/types/Datacubes';
import { SOURCE_LAYERS } from '@/utils/map-util-new';
import { REGION_ID_DELIMETER, adminLevelToString } from '@/utils/admin-level-util';

export default function useMapRegionSelection(
  selectedLayerId: Ref<string>,
  selectedRegions: Ref<AdminRegionSets>
) {
  const isRegionSelectionEmpty = computed(() => {
    // Check if there are selected regions in the current admin level or in the levels above.
    const level = SOURCE_LAYERS.findIndex(l => l.layerId === selectedLayerId.value);
    const { country, admin1, admin2, admin3 } = selectedRegions.value;
    const checks = [country.size === 0, admin1.size === 0, admin2.size === 0, admin3.size === 0];
    return checks.slice(0, level + 1).reduce((prev, cur) => prev && cur, true);
  });
  const isRegionSelected = (regionId: string) => {
    const regionIdTokens = regionId.split(REGION_ID_DELIMETER);
    // Check if the regionId is included in the selection. Check with the parent selection if there's a parent region selection.
    let checkParentLevel = true;
    while (regionIdTokens.length > 0 && checkParentLevel) {
      const rid = regionIdTokens.join(REGION_ID_DELIMETER);
      const curLevelRegionSelection = (selectedRegions.value)[adminLevelToString(regionIdTokens.length - 1) as keyof AdminRegionSets];
      if (curLevelRegionSelection.has(rid)) {
        return true;
      }
      // If there's no selection in the current level, check the selection from parent level.
      checkParentLevel = curLevelRegionSelection.size === 0;
      // Drop the current admin level region name from the id resulting the parent region id.
      regionIdTokens.pop();
    }
    return false;
  };

  return {
    isRegionSelectionEmpty,
    isRegionSelected
  };
}
