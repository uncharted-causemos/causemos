import { ref } from '@vue/reactivity';
import { ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';
import { RegionalAggregations } from '@/types/Runoutput';
import { ComputedRef, Ref, watchEffect } from 'vue';
import { computeMapBoundsForCountries } from '@/utils/map-util-new';

export default function useMapBounds(
  regionalData: Ref<RegionalAggregations | null>,
  selectedAdminLevel: Ref<number>,
  selectedRegionIds: ComputedRef<string[]>
) {
  const mapBounds = ref<number[][]>([
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
      mapBounds.value = newBounds;
    }
  });

  return {
    onSyncMapBounds,
    mapBounds
  };
}
