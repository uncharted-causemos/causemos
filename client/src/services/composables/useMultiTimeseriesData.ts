import API from '@/api/api';
import { Datacube } from '@/types/Datacube';
import { AggregationOption, DataTransform, TemporalResolutionOption, TemporalResolution, SPLIT_BY_VARIABLE } from '@/types/Enums';
import { Timeseries } from '@/types/Timeseries';
import { colorFromIndex } from '@/utils/colors-util';
import _ from 'lodash';
import { computed, Ref, ref, watch, watchEffect } from 'vue';
import { correctIncompleteTimeseries } from '@/utils/incomplete-data-detection';

/**
 * Takes a list of variable names, and fetches the timeseries data for each,
 * then assigns a colour to each timeseries following its variable name,
 * returning the resulting list of Timeseries objects.
 *
 * NOTE: modelRunIds will always be an array with a single item
 * because split-bay-variable will be active when this composable is used
 */
export default function useMultiTimeseriesData(
  metadata: Ref<Datacube | null>,
  modelRunIds: Ref<string[]>,
  selectedTemporalResolution: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedSpatialAggregation: Ref<string>,
  breakdownOption: Ref<string | null>,
  selectedTransform: Ref<DataTransform>,
  activeFeatures: Ref<string[]>
) {
  const timeseriesData = ref<Timeseries[]>([]);
  const selectedGlobalTimestamp: Ref<number | null> = ref(null);
  const selectedGlobalTimestampRange = ref(null) as Ref<{start: number; end: number} | null>;

  const temporalRes = computed(() =>
    selectedTemporalResolution.value !== ''
      ? selectedTemporalResolution.value
      : TemporalResolutionOption.Month
  );

  const temporalAgg = computed(() =>
    selectedTemporalAggregation.value !== ''
      ? selectedTemporalAggregation.value
      : AggregationOption.Sum
  );

  // REVIEW: consider refactoring the fetchTimeseries() outside the watchEffect
  //  see https://gitlab.uncharted.software/WM/causemos/-/merge_requests/809
  watchEffect(onInvalidate => {
    const datacubeMetadata = metadata.value;
    if (modelRunIds.value.length === 0 || datacubeMetadata === null || breakdownOption.value !== SPLIT_BY_VARIABLE || activeFeatures.value.length === 0) {
      // Don't have the information needed to fetch the data
      return;
    }
    const dataId = datacubeMetadata.data_id;
    let isCancelled = false;
    async function fetchTimeseries() {
      // Fetch the timeseries data for each modelRunId
      const spatialAgg =
        selectedSpatialAggregation.value !== ''
          ? selectedSpatialAggregation.value
          : AggregationOption.Mean;
      const transform =
        selectedTransform.value !== DataTransform.None
          ? selectedTransform.value
          : undefined;

      let promises: Promise<{ data: any } | null>[] = [];

      // NOTE: we will always have one scenario selected if we breakdown by variable
      // since upon the selection on more than one run, the breakdown options are disabled
      const allFeaturesAndRunIds: {runId: string; featureName: string}[] = [];
      modelRunIds.value.forEach(runId => {
        activeFeatures.value.forEach(featureName => {
          allFeaturesAndRunIds.push({
            runId,
            featureName
          });
        });
      });

      // If no regions are selected, pass "undefined" as the region_id
      //  to get the aggregated timeseries for all regions.
      promises = allFeaturesAndRunIds.map(runAndFeature => {
        return API.get('maas/output/timeseries', {
          params: {
            data_id: dataId,
            run_id: runAndFeature.runId,
            feature: runAndFeature.featureName,
            resolution: temporalRes.value,
            temporal_agg: temporalAgg.value,
            spatial_agg: spatialAgg,
            transform: transform,
            region_id: undefined
          }
        });
      });
      const fetchResults = (await Promise.all(promises))
        .filter(response => response !== null)
        .map((response: any) => response.data);
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }

      const modelRunIndx = 0; // REVIEW
      timeseriesData.value = fetchResults.map((rawPoints, indx) => {
        const name = activeFeatures.value[indx];
        const id = modelRunIds.value[modelRunIndx];
        const color = colorFromIndex(indx);
        const isDefaultRun = false;

        const output = metadata.value?.outputs.find(output => output.name === name);
        const rawResolution = output?.data_resolution?.temporal_resolution ?? TemporalResolution.Other;
        const finalRawDate = new Date(metadata.value?.period?.lte ?? 0);

        const { points, action } = correctIncompleteTimeseries(rawPoints, rawResolution,
          temporalRes.value as TemporalResolutionOption,
          temporalAgg.value as AggregationOption, finalRawDate);

        return { name, id, color, points, isDefaultRun, correctiveAction: action };
      });
    }
    onInvalidate(() => {
      isCancelled = true;
    });

    fetchTimeseries();
  });

  // Whenever the selected breakdown option or timeseries data changes,
  //  reselect the last timestamp across all series
  watch(
    () => [timeseriesData.value],
    () => {
      const allTimestamps = timeseriesData.value
        .map(timeseries => timeseries.points)
        .flat()
        .map(point => point.timestamp);
      if (allTimestamps.length === 0) {
        return;
      }
      selectedGlobalTimestamp.value = _.max(allTimestamps) ?? 0;

      // select the timestamp range as the full data extend
      const firstTimestamp = _.min(allTimestamps) ?? 0;
      const lastTimestamp = selectedGlobalTimestamp.value;
      // set initial timestamp selection range
      const newTimestampRange = { start: firstTimestamp, end: lastTimestamp };
      selectedGlobalTimestampRange.value = newTimestampRange;
    }
  );

  const setSelectedGlobalTimestamp = (timestamp: number | null) => {
    if (selectedGlobalTimestamp.value === timestamp) return;
    selectedGlobalTimestamp.value = timestamp;
  };

  const setSelectedGlobalTimestampRange = (newTimestampRange: {start: number; end: number}) => {
    if (selectedGlobalTimestampRange.value?.start === newTimestampRange.start &&
      selectedGlobalTimestampRange.value?.end === newTimestampRange.end) {
      return;
    }
    selectedGlobalTimestampRange.value = newTimestampRange;
  };

  return {
    globalTimeseries: timeseriesData,
    selectedGlobalTimestamp,
    selectedGlobalTimestampRange,
    setSelectedGlobalTimestampRange,
    setSelectedGlobalTimestamp
  };
}
