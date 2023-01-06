import _ from 'lodash';
import { ref } from '@vue/reactivity';
import { ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';
import { RegionalAggregations } from '@/types/Outputdata';
import { Ref, watchEffect } from 'vue';
import { getBboxFromRegionIds } from '@/services/geo-service';

export default function useMapBounds(
  regionalData: Ref<RegionalAggregations | null>,
  selectedRegionIds: Ref<string[]>
) {
  // FIXME: this can be greatly simplified. useMapBounds is only used in two
  //  places and it's unclear why mapBounds can be set to two different possible
  //  values.
  const mapBounds = ref<number[][] | { value: number[][]; options: any }>([
    [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
    [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP],
  ]);

  const onSyncMapBounds = (bounds: number[][]) => {
    mapBounds.value = bounds;
  };

  watchEffect(async () => {
    if (!regionalData.value) return;

    // If there's no selected regions, use countries to get the bounds
    const regionIds = !selectedRegionIds.value.length
      ? (regionalData.value?.country || []).map((item) => item.id)
      : selectedRegionIds.value;
    //
    // calculate the initial map bounds covering the model geography
    //
    const newBounds = await getBboxFromRegionIds(regionIds);
    if (newBounds !== null) {
      // ask the map to fit the new map bounds
      const options = {
        padding: 20, // pixels
        duration: 1000, // milliseconds
        essential: true, // this animation is considered essential with respect to prefers-reduced-motion
      };
      mapBounds.value = { value: newBounds, options };
    }
  });

  return {
    onSyncMapBounds,
    mapBounds,
  };
}
