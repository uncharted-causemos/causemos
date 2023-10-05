import { getTimeseries } from '@/services/outputdata-service';
import { BreakdownStateYears, Indicator, Model } from '@/types/Datacube';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { breakdownByYear } from '@/utils/timeseries-util';
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
      async function fetchTimeseries() {
        // Fetch the timeseries data for each modelRunId
        const dataId = metadata.value.data_id;
        const { regionId, outputName, modelRunId } = breakdownState.value;
        const result = await getTimeseries({
          modelId: dataId,
          runId: modelRunId,
          outputVariable: outputName,
          temporalResolution: TemporalResolutionOption.Year,
          temporalAggregation: AggregationOption.Mean,
          spatialAggregation: AggregationOption.Mean,
          transform: undefined,
          // If no region is selected, pass "undefined" as the region_id to get the aggregated
          // timeseries for all regions.
          regionId: regionId ?? undefined,
        });
        if (isCancelled) {
          // Dependencies have changed since the fetch started, so ignore the fetch results to avoid
          //  a race condition.
          return;
        }
        availableYears.value = Object.keys(breakdownByYear(result));
      }
      onInvalidate(() => {
        isCancelled = true;
      });
      fetchTimeseries();
    },
    { immediate: true }
  );
  return { availableYears };
}
