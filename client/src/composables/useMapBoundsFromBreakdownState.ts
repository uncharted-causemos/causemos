import _ from 'lodash';
import { ref } from '@vue/reactivity';
import { ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';
import { RegionalAggregations } from '@/types/Outputdata';
import { Ref, watch } from 'vue';
import { getBboxForEachRegionId, getBboxFromRegionIds } from '@/services/geo-service';
import { BreakdownState } from '@/types/Datacube';
import {
  isBreakdownStateQualifiers,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';

// Map bounds can be either
//  - 4 numbers or
//  - an object containing the numbers along with an object to specify animation parameters for
//    transitioning to the new bounds.
type SimpleMapBounds = number[][];
type MapBoundsWithAnimationParameters = {
  value: SimpleMapBounds;
  options: { padding: number; duration: number; essential: boolean };
};
type MapBounds = SimpleMapBounds | MapBoundsWithAnimationParameters;

export default function useMapBoundsFromBreakdownState(
  breakdownState: Ref<BreakdownState | null>,
  regionalData: Ref<RegionalAggregations | null>
) {
  const mapBounds = ref<MapBounds>([
    [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
    [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP],
  ]);
  const mapBoundsForEachRegion = ref<{ [regionId: string]: MapBounds }>({});

  // Whenever the breakdown state changes, set the map bounds to focus on the selected regions
  watch(
    breakdownState,
    async () => {
      const state = breakdownState.value;
      if (state === null) return;
      if (isBreakdownStateRegions(state)) {
        const bboxes = await getBboxForEachRegionId(state.regionIds);
        const result: { [outputSpecId: string]: SimpleMapBounds } = {};
        state.regionIds.forEach((regionId, index) => {
          const bbox = bboxes[index];
          if (bbox) result[regionId] = bbox;
        });
        mapBoundsForEachRegion.value = result;
        return;
      }
      // If there's no selected regions, select all countries in the regional data
      const regionIds =
        (isBreakdownStateQualifiers(state) || isBreakdownStateYears(state)) &&
        state.regionId !== null
          ? [state.regionId]
          : (regionalData.value?.country || []).map((item) => item.id);
      if (regionIds.length === 0) return;
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
    },
    { immediate: true }
  );

  const onMapMove = (bounds: SimpleMapBounds) => {
    if (breakdownState.value !== null && isBreakdownStateRegions(breakdownState.value)) {
      return;
    }
    mapBounds.value = bounds;
  };

  const getMapBounds = (outputSpecId: string) => {
    if (breakdownState.value !== null && isBreakdownStateRegions(breakdownState.value)) {
      return mapBoundsForEachRegion.value[outputSpecId];
    }
    return mapBounds.value;
  };

  return {
    onMapMove,
    getMapBounds,
  };
}
