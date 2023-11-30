import { fetchAvailableYears } from '@/services/outputdata-service';
import { BreakdownStateYears, Indicator, Model } from '@/types/Datacube';
import { Ref, ref, watch } from 'vue';

export function useAvailableYears(
  metadata: Ref<Model | Indicator>,
  breakdownState: Ref<BreakdownStateYears>
) {
  const availableYears = ref<string[] | null>(null);
  watch(
    [
      metadata,
      () => breakdownState.value.regionId,
      () => breakdownState.value.outputName,
      () => breakdownState.value.modelRunId,
    ],
    (newValues, oldValues, onInvalidate) => {
      let isCancelled = false;
      async function _fetchAvailableYears() {
        const dataId = metadata.value.data_id;
        const { regionId, outputName, modelRunId } = breakdownState.value;
        const result = await fetchAvailableYears(dataId, regionId, outputName, modelRunId);
        if (isCancelled) {
          // Dependencies have changed since the fetch started, so ignore the fetch results to avoid
          //  a race condition.
          return;
        }
        availableYears.value = result;
      }
      onInvalidate(() => {
        isCancelled = true;
      });
      _fetchAvailableYears();
    },
    { immediate: true }
  );
  return { availableYears };
}
