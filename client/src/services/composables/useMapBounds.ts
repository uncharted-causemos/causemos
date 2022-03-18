import _ from 'lodash';
import { ref } from '@vue/reactivity';
import { ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';
import { RegionalAggregations } from '@/types/Outputdata';
import { Ref, watchEffect } from 'vue';
import { AdminRegionSets } from '@/types/Datacubes';
import { getParentSelectedRegions } from '@/utils/admin-level-util';
import { getBboxFromRegionIds } from '@/services/geo-service';

export default function useMapBounds(
  regionalData: Ref<RegionalAggregations | null>,
  selectedAdminLevel: Ref<number>,
  selectedRegionIdsAtAllLevels: Ref<AdminRegionSets>
) {
  const mapBounds = ref<number[][] | { value: number[][], options: any }>([
    [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
    [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
  ]);

  const onSyncMapBounds = (bounds: number[][]) => {
    mapBounds.value = bounds;
  };

  watchEffect(async () => {
    const regionSelection = getParentSelectedRegions(selectedRegionIdsAtAllLevels.value, selectedAdminLevel.value);
    if (!regionalData.value && !regionSelection?.length) return;

    // If there's no selected regions, use countries to get the bounds
    const regionIds = !regionSelection?.length
      ? (regionalData.value?.country || []).map(item => item.id)
      : regionSelection;
    //
    // calculate the initial map bounds covering the model geography
    //
    const newBounds = await getBboxFromRegionIds(regionIds);
    if (newBounds !== null) {
      // ask the map to fit the new map bounds
      const options = {
        padding: 20, // pixels
        duration: 1000, // milliseconds
        essential: true // this animation is considered essential with respect to prefers-reduced-motion
      };
      mapBounds.value = { value: newBounds, options };
    }
  });

  return {
    onSyncMapBounds,
    mapBounds
  };
}
