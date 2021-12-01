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
    if (selectedAdminLevel.value === 0) {
      // only support fitting map bounds when the selectedAdminLevel is 'country'
      const countriesAgg = regionalData.value.country;
      if (countriesAgg !== undefined && countriesAgg.length > 0) {
        let countries = countriesAgg.map(countryAgg => countryAgg.id);
        // do we have a sub-selection
        if (selectedRegionIds.value.length === 0) {
          // all regions selected
        } else {
          countries = selectedRegionIds.value;
        }

        //
        // calculate the initial map bounds covering the model geography
        //
        const newBounds = await computeMapBoundsForCountries(countries);
        if (newBounds !== null) {
          // ask the map to fit the new map bounds
          mapBounds.value = newBounds;
        }
      }
    }
  });

  return {
    onSyncMapBounds,
    mapBounds
  };
}
