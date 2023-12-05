import { getRegionLists } from '@/services/outputdata-service';
import { DatacubeGeography } from '@/types/Common';
import { BreakdownState, Indicator, Model } from '@/types/Datacube';
import {
  isBreakdownStateNone,
  isBreakdownStateQualifiers,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';
import { Ref, ref, watch } from 'vue';

export function useAvailableRegions(
  metadata: Ref<Model | Indicator | null>,
  breakdownState: Ref<BreakdownState | null>
) {
  const availableRegions = ref<DatacubeGeography | null>(null);
  watch(
    [breakdownState, metadata],
    async () => {
      if (metadata.value === null || breakdownState.value === null) return;
      let modelRunIds: string[] = [];
      let outputName = '';
      if (
        isBreakdownStateRegions(breakdownState.value) ||
        isBreakdownStateYears(breakdownState.value) ||
        isBreakdownStateQualifiers(breakdownState.value)
      ) {
        modelRunIds = [breakdownState.value.modelRunId];
        outputName = breakdownState.value.outputName;
      } else if (isBreakdownStateNone(breakdownState.value)) {
        modelRunIds = breakdownState.value.modelRunIds;
        outputName = breakdownState.value.outputName;
      } else {
        modelRunIds = [breakdownState.value.modelRunId];
        outputName = breakdownState.value.outputNames[0];
      }
      const result = await getRegionLists(
        metadata.value.data_id,
        modelRunIds, // TODO: if indicator, return 'indicator'
        outputName
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
