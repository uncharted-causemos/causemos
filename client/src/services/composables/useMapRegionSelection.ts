import _ from 'lodash';
import { Ref, computed } from 'vue';
import { AdminRegionSets } from '@/types/Datacubes';
import { SOURCE_LAYERS } from '@/utils/map-util-new';
import { isRegionSelected } from '@/utils/admin-level-util';

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

  return {
    isRegionSelectionEmpty,
    isRegionSelected: (regionId: string) => isRegionSelected(selectedRegions.value, regionId)
  };
}
