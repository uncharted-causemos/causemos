import _ from 'lodash';
import { ref } from '@vue/reactivity';
import { ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';
import { RegionalAggregations } from '@/types/Outputdata';
import { Ref, watchEffect } from 'vue';
import { computeMapBoundsForCountries } from '@/utils/map-util-new';
import { AdminRegionSets } from '@/types/Datacubes';

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
    const { country, admin1, admin2, admin3 } = selectedRegionIdsAtAllLevels.value;
    // Selection from the smallest available admin level
    const regionSelection =
      [country, admin1, admin2, admin3]
        .slice(0, selectedAdminLevel.value + 1) // only consider levels above the current level
        .filter(set => set.size > 0) // filter out admin levels with no selection
        .map(set => Array.from(set)) // convert the set to array
        .pop(); // get the last item (selection from the smallest available admin level)
    if (!regionalData.value && !regionSelection?.length) return;

    // If there's no selected regions, use countries to get the bounds
    const regionIds = !regionSelection?.length
      ? (regionalData.value?.country || []).map(item => item.id)
      : regionSelection;
    //
    // calculate the initial map bounds covering the model geography
    //
    const newBounds = await computeMapBoundsForCountries(regionIds);
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
