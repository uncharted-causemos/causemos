import API from '@/api/api';
import { Datacube } from '@/types/Datacube';
import { TemporalAggregationLevel } from '@/types/Enums';
import { Timeseries } from '@/types/Timeseries';
import { colorFromIndex } from '@/utils/colors-util';
import { getMonthFromTimestamp, getYearFromTimestamp } from '@/utils/date-util';
import _ from 'lodash';
import { computed, Ref, ref, watch, watchEffect } from 'vue';
import { useStore } from 'vuex';

const applyBreakdown = (
  timeseriesData: Timeseries[],
  breakdownOption: string | null
) => {
  if (breakdownOption === null || timeseriesData.length !== 1) {
    return timeseriesData;
  }
  // FIXME: Still need to add logic for breaking down timeseries by other
  //  temporal aggregation levels and by other facets of the data
  const onlyTimeseries = timeseriesData[0].points;
  const brokenDownByYear = _.groupBy(onlyTimeseries, point =>
    getYearFromTimestamp(point.timestamp)
  );
  // FIXME: remove -5 slice, replace it with aggregation pane checkbox state
  return Object.values(brokenDownByYear)
    .slice(-5)
    .map((points, index) => {
      return { color: colorFromIndex(index), points };
    });
};

const applyRelativeTo = (
  timeseriesData: Timeseries[],
  relativeTo: number | null
) => {
  if (relativeTo === null || timeseriesData.length < 2) {
    return timeseriesData;
  }
  // User wants to display data relative to one run
  const baselineData = timeseriesData[relativeTo];
  const returnValue: Timeseries[] = [];
  timeseriesData.forEach((timeseries, index) => {
    if (index === relativeTo) return;
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
};

/**
 * Takes a model ID, a list of model run IDs, and a colouring function,
 * fetches the timeseries data for each run, then assigns a colour to
 * each timeseries using the colouring function, returning the resulting
 * list of Timeseries objects.
 */
export default function useTimeseriesData(
  metadata: Ref<Datacube | null>,
  modelId: Ref<string>,
  modelRunIds: Ref<string[]>,
  selectedTemporalResolution: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedSpatialAggregation: Ref<string>,
  breakdownOption: Ref<string | null>,
  onNewLastTimestamp: (lastTimestamp: number) => void
) {
  const rawTimeseriesData = ref<Timeseries[]>([]);

  const store = useStore();
  const currentOutputIndex = computed(
    () => store.getters['modelPublishStore/currentOutputIndex']
  );

  watchEffect(onInvalidate => {
    rawTimeseriesData.value = [];
    if (
      modelRunIds.value.length === 0 ||
      metadata.value === null ||
      currentOutputIndex.value === undefined
    ) {
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
      let spatialAgg = 'mean';
      if (selectedSpatialAggregation.value !== '') {
        spatialAgg = selectedSpatialAggregation.value;
      }
      const modelMetadata = metadata.value;
      if (!modelMetadata) return;
      const outputs = modelMetadata.validatedOutputs
        ? modelMetadata.validatedOutputs
        : modelMetadata.outputs;
      const promises = modelRunIds.value.map(runId =>
        API.get('maas/output/timeseries', {
          params: {
            model_id: modelId.value,
            run_id: runId,
            feature: outputs[currentOutputIndex.value].name,
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
      //  `rawTimeseriesData` ref
      rawTimeseriesData.value = fetchResults.map((points, index) => {
        const color = colorFromIndex(index);
        return { color, points };
      });
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchTimeseries();
  });

  const relativeTo = ref<number | null>(null);
  // Whenever the selected runs change, reset "relative to" state
  watch(
    () => modelRunIds.value,
    () => {
      relativeTo.value = null;
    },
    {
      immediate: true
    }
  );

  const processedTimeseriesData = computed(() => {
    if (rawTimeseriesData.value.length === 0) return [];
    const afterApplyingBreakdown = applyBreakdown(
      rawTimeseriesData.value,
      breakdownOption.value
    );
    return applyRelativeTo(afterApplyingBreakdown, relativeTo.value);
  });

  watch(
    () => [breakdownOption.value, rawTimeseriesData.value],
    () => {
      const preprocessingStep =
        breakdownOption.value === TemporalAggregationLevel.Year
          ? getMonthFromTimestamp
          : (timestamp: number) => timestamp;
      const allTimestamps = rawTimeseriesData.value
        .map(timeseries => timeseries.points)
        .flat()
        .map(point => preprocessingStep(point.timestamp));
      const lastTimestamp = _.max(allTimestamps);
      if (lastTimestamp !== undefined) {
        onNewLastTimestamp(lastTimestamp);
      }
    }
  );

  const setRelativeTo = (newValue: number | null) => {
    relativeTo.value = newValue;
  };

  return {
    timeseriesData: processedTimeseriesData,
    relativeTo,
    setRelativeTo
  };
}
