import API from '@/api/api';
import { Datacube } from '@/types/Datacube';
import { AggregationOption, DataTransform, TemporalResolutionOption, TemporalResolution, SPLIT_BY_VARIABLE } from '@/types/Enums';
import { Timeseries } from '@/types/Timeseries';
import { colorFromIndex } from '@/utils/colors-util';
import _ from 'lodash';
import { Ref, ref, watch, watchEffect } from 'vue';
import { correctIncompleteTimeseries } from '@/utils/incomplete-data-detection';
import { OutputVariableSpecs } from '@/types/Outputdata';

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
  breakdownOption: Ref<string | null>,
  activeFeatures: Ref<OutputVariableSpecs[]>
) {
  const timeseriesData = ref<Timeseries[]>([]);
  const selectedGlobalTimestamp: Ref<number | null> = ref(null);
  const selectedGlobalTimestampRange = ref(null) as Ref<{start: number; end: number} | null>;

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
      // Fetch the timeseries data for each active feature
      let promises: Promise<{ data: any } | null>[] = [];

      // NOTE: we will always have one scenario selected if we breakdown by variable
      // since upon the selection on more than one run, the breakdown options are disabled
      const allFeaturesAndRunIds: {runId: string; featureName: string; temporalResolution: TemporalResolutionOption; temporalAggregation: AggregationOption; spatialAggregation: AggregationOption; transform?: DataTransform; }[] = [];
      modelRunIds.value.forEach(runId => {
        activeFeatures.value.forEach(feature => {
          allFeaturesAndRunIds.push({
            runId,
            featureName: feature.name,
            temporalAggregation: feature.temporalAggregation !== AggregationOption.None ? feature.temporalAggregation : AggregationOption.Sum,
            spatialAggregation: feature.spatialAggregation !== AggregationOption.None ? feature.spatialAggregation : AggregationOption.Mean,
            transform: feature.transform !== DataTransform.None ? feature.transform : undefined,
            temporalResolution: feature.temporalResolution !== TemporalResolutionOption.None ? feature.temporalResolution : TemporalResolutionOption.Month
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
            resolution: runAndFeature.temporalResolution,
            temporal_agg: runAndFeature.temporalAggregation,
            spatial_agg: runAndFeature.spatialAggregation,
            transform: runAndFeature.transform,
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
        const name = allFeaturesAndRunIds[indx].featureName;
        const id = modelRunIds.value[modelRunIndx];
        const color = colorFromIndex(indx);
        const isDefaultRun = false;

        const output = metadata.value?.outputs.find(output => output.name === name);
        const rawResolution = output?.data_resolution?.temporal_resolution ?? TemporalResolution.Other;
        const finalRawDate = new Date(metadata.value?.period?.lte ?? 0);

        const { points, action } = correctIncompleteTimeseries(
          rawPoints, rawResolution,
          allFeaturesAndRunIds[indx].temporalResolution,
          allFeaturesAndRunIds[indx].temporalAggregation,
          finalRawDate);

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
