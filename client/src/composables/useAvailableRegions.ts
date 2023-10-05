import { getRegionLists } from '@/services/outputdata-service';
import { DatacubeGeography } from '@/types/Common';
import { BreakdownStateRegions, BreakdownStateYears, Indicator, Model } from '@/types/Datacube';
import { Ref, ref, watch } from 'vue';

export function useAvailableRegions(
  metadata: Ref<Model | Indicator>,
  breakdownState: Ref<BreakdownStateRegions | BreakdownStateYears>
) {
  const availableRegions = ref<DatacubeGeography | null>(null);
  watch(
    [() => breakdownState.value.modelRunId, () => breakdownState.value.outputName, metadata],
    async () => {
      const result = await getRegionLists(
        metadata.value.data_id,
        [breakdownState.value.modelRunId], // TODO: if indicator, return 'indicator'
        breakdownState.value.outputName
      );
      // Sort each list alphabetically
      Object.values(result).forEach((regions) => {
        regions.sort();
      });
      availableRegions.value = result;
    },
    { immediate: true }
  );
  return { availableRegions };
}
