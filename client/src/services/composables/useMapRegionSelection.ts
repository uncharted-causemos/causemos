import _ from 'lodash';
import { Ref, computed } from 'vue';
import { AdminRegionSets } from '@/types/Datacubes';
import { SOURCE_LAYERS } from '@/utils/map-util-new';
import { isRegionSelected, isSelectionEmpty } from '@/utils/admin-level-util';

export default function useMapRegionSelection(
  selectedLayerId: Ref<string>,
  selectedRegions: Ref<AdminRegionSets>
) {
  const isRegionSelectionEmpty = computed(() => {
    // Check if there are selected regions in the current admin level or in the levels above.
    const level = SOURCE_LAYERS.findIndex((l) => l.layerId === selectedLayerId.value);
    return isSelectionEmpty(selectedRegions.value, level);
  });

  return {
    isRegionSelectionEmpty,
    isRegionSelected: (regionId: string) => isRegionSelected(selectedRegions.value, regionId),
  };
}
