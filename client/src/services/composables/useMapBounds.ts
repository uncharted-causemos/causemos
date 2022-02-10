import { ref } from '@vue/reactivity';
import { ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';
import { RegionalAggregations } from '@/types/Outputdata';
import { ComputedRef, Ref, watchEffect } from 'vue';
import { computeMapBoundsForCountries } from '@/utils/map-util-new';

export default function useMapBounds(
  regionalData: Ref<RegionalAggregations | null>,
  selectedAdminLevel: Ref<number>,
  selectedRegionIds: ComputedRef<string[]>
) {
  const mapBounds = ref<number[][] | { value: number[][], options: any }>([
    [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
    [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
  ]);

  const onSyncMapBounds = (bounds: number[][]) => {
    mapBounds.value = bounds;
  };

  watchEffect(async () => {
    if (!regionalData.value || !selectedRegionIds.value) {
      return;
    }
    const regionIds = selectedRegionIds.value.length === 0
      ? (regionalData.value.country || []).map(item => item.id)
      : selectedRegionIds.value;
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
