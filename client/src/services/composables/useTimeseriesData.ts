import API from '@/api/api';
import { Timeseries } from '@/types/Timeseries';
import { computed, Ref, ref, watchEffect } from 'vue';

/**
 * Takes a model ID, a list of model run IDs, and a colouring function,
 * fetches the timeseries data for each run, then assigns a colour to
 * each timeseries using the colouring function, returning the resulting
 * list of Timeseries objects.
 */
export default function useTimeseriesData(
  modelId: Ref<string>,
  modelRunIds: Ref<string[]>,
  colorFromIndex: (index: number) => string,
  selectedTemporalResolution: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedSpatialAggregation: Ref<string>
) {
  const timeseriesData = ref<Timeseries[]>([]);

  watchEffect(onInvalidate => {
    timeseriesData.value = [];
    if (modelRunIds.value.length === 0) {
      // Don't have the information needed to fetch the data
      return;
    }
    let isCancelled = false;
    async function fetchTimeseries() {
      // Fetch the timeseries data for each modelRunId
      let temporalRes = 'month';
      if (selectedTemporalResolution.value !== '') {
        temporalRes = selectedTemporalResolution.value;
      }
      let temporalAgg = 'sum';
      if (selectedTemporalAggregation.value !== '') {
        temporalAgg = selectedTemporalAggregation.value;
      }
      let spatialAgg = 'sum';
      if (selectedSpatialAggregation.value !== '') {
        spatialAgg = selectedSpatialAggregation.value;
      }
      const promises = modelRunIds.value.map(runId =>
        API.get('maas/output/timeseries', {
          params: {
            model_id: modelId.value,
            run_id: runId,
            feature: 'Hopper Presence Prediction', // "Probability of presence of locust hoppers" // production
            resolution: temporalRes,
            temporal_agg: temporalAgg,
            spatial_agg: spatialAgg
          }
        })
      );
      const fetchResults = (await Promise.all(promises)).map(response =>
        Array.isArray(response.data) ? response.data : JSON.parse(response.data)
      );
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      // Assign a colour to each timeseries and store it in the
      //  `timeseriesData` ref
      timeseriesData.value = modelRunIds.value.map((modelRunId, index) => {
        const color = colorFromIndex(index);
        return { color, points: fetchResults[index] };
      });
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchTimeseries();
  });

  const relativeTo = ref<number | null>(null);
  const timeseriesDataForDisplay = computed(() => {
    if (timeseriesData.value.length === 0) return [];
    if (relativeTo.value === null || timeseriesData.value.length < 2) {
      return timeseriesData.value;
    }
    // User wants to display data relative to one run
    const baselineData = timeseriesData.value[relativeTo.value];
    const returnValue: Timeseries[] = [];
    timeseriesData.value.forEach((timeseries, index) => {
      if (index === relativeTo.value) return;
      // Adjust values
      const { color, points } = timeseries;
      const adjustedPoints = points.map(({ timestamp, value }) => {
        const baselineValue =
          baselineData.points.find(point => point.timestamp === timestamp)
            ?.value ?? 0;
        return {
          timestamp,
          value: value - baselineValue
        };
      });
      returnValue.push({
        color,
        points: adjustedPoints
      });
    });
    return returnValue;
  });

  return { timeseriesData: timeseriesDataForDisplay, relativeTo };
}
