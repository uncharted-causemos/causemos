import {
  BreakdownState,
  BreakdownStateNone,
  BreakdownStateOutputs,
  BreakdownStateQualifiers,
  BreakdownStateRegions,
  BreakdownStateYears,
  Indicator,
  Model,
} from '@/types/Datacube';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { Timeseries, TimeseriesPoint } from '@/types/Timeseries';
import { getRegionIdDisplayName } from '@/utils/admin-level-util';
import { colorFromIndex } from '@/utils/colors-util';
import _ from 'lodash';
import { computed, Ref, ref, watch } from 'vue';
import {
  getQualifierTimeseries,
  getBulkTimeseries,
  getTimeseries,
} from '../services/outputdata-service';
import {
  getOutput,
  isBreakdownStateNone,
  isBreakdownStateOutputs,
  isBreakdownStateRegions,
  isBreakdownStateYears,
} from '@/utils/datacube-util';
import { getModelRunMetadata } from '@/services/datacube-service';
import {
  applyRelativeTo,
  breakdownByYear,
  convertTimestampsToMonthIndex,
} from '@/utils/timeseries-util';

async function fetchTimeseriesByRegion(
  breakdownState: BreakdownStateRegions,
  dataId: string,
  spatialAggregationMethod: AggregationOption,
  temporalAggregationMethod: AggregationOption,
  temporalResolution: TemporalResolutionOption
) {
  // TODO: regional reference timeseries
  // if (
  //   referenceOptions !== undefined &&
  //   breakdownOption.value === SpatialAggregationLevel.Region
  // ) {
  //   // 1. filter out aggregated types
  //   // 2. push the non-aggregated reference regions.
  //   referenceOptions.value
  //     .filter(
  //       (region) =>
  //         !Object.values(ReferenceSeriesOption).includes(region as ReferenceSeriesOption)
  //     )
  //     .forEach((region) => allRegionIds.push(region));
  // }
  const regionIds = breakdownState.regionIds;
  const { data } = await getBulkTimeseries(
    {
      modelId: dataId,
      runId: breakdownState.modelRunId,
      outputVariable: breakdownState.outputName,
      temporalResolution,
      temporalAggregation: temporalAggregationMethod,
      spatialAggregation: spatialAggregationMethod,
      transform: undefined,
    },
    regionIds
  );
  return data.map(
    (regionalTimeseries: { region_id: string; timeseries: TimeseriesPoint[] }, index: number) => {
      // Take the last segment of the region ID to get its display name
      const name = getRegionIdDisplayName(regionIds[index]);
      const isDefaultRun = false;
      const id = regionIds[index];
      const color = colorFromIndex(index);
      const points: TimeseriesPoint[] = regionalTimeseries.timeseries;
      return { name, id, color, points, isDefaultRun };
    }
  );
}

async function fetchTimeseriesByModelRun(
  breakdownState: BreakdownStateNone,
  dataId: string,
  spatialAggregationMethod: AggregationOption,
  temporalAggregationMethod: AggregationOption,
  temporalResolution: TemporalResolutionOption
) {
  const promises = breakdownState.modelRunIds.map((runId) =>
    getTimeseries({
      modelId: dataId,
      runId,
      outputVariable: breakdownState.outputName,
      temporalResolution,
      temporalAggregation: temporalAggregationMethod,
      spatialAggregation: spatialAggregationMethod,
      transform: undefined,
      regionId: undefined,
    })
  );
  const modelRuns = await getModelRunMetadata(dataId);
  const results = await Promise.all(promises);
  return results.map((points, index) => {
    const modelRunId = breakdownState.modelRunIds[index];
    const modelRunMetadata = modelRuns.find((run) => run.id === modelRunId);
    const name = modelRunMetadata?.name ?? 'no name: ' + index;
    const color = colorFromIndex(index);
    return {
      name,
      id: modelRunId,
      color,
      points,
      isDefaultRun: modelRunMetadata?.is_default_run ?? false,
    };
  });
}

async function fetchTimeseriesByYears(
  breakdownState: BreakdownStateYears,
  dataId: string,
  spatialAggregationMethod: AggregationOption,
  temporalAggregationMethod: AggregationOption,
  temporalResolution: TemporalResolutionOption
) {
  const points = await getTimeseries({
    modelId: dataId,
    runId: breakdownState.modelRunId,
    outputVariable: breakdownState.outputName,
    temporalResolution,
    temporalAggregation: temporalAggregationMethod,
    spatialAggregation: spatialAggregationMethod,
    transform: undefined,
    regionId: undefined,
  });
  const brokenDownByYear = breakdownByYear(points);
  return Object.keys(brokenDownByYear)
    .filter((year) => breakdownState.years.includes(year))
    .map((year, index) => {
      const points = brokenDownByYear[year];
      // When "split by year" is active, timestamps need to be mapped from the standard epoch
      //  format, e.g. `1451606400` for `Dec 31, 2015 @ 7pm` to "the month's index", e.g. `1`
      //  for `February` to be able to compare months from different years in the timeseries.
      const mappedToBreakdownDomain = convertTimestampsToMonthIndex(points);
      return {
        name: year,
        id: year,
        color: colorFromIndex(index),
        points: mappedToBreakdownDomain,
        isDefaultRun: false,
      };
    });
}

async function fetchTimeseriesByOutputs(
  breakdownState: BreakdownStateOutputs,
  dataId: string,
  metadata: Model | Indicator,
  spatialAggregationMethod: AggregationOption,
  temporalAggregationMethod: AggregationOption,
  temporalResolution: TemporalResolutionOption
) {
  // Fetch the timeseries data for each active feature
  const promises = breakdownState.outputNames.map((outputName) =>
    getTimeseries({
      modelId: dataId,
      runId: breakdownState.modelRunId,
      outputVariable: outputName,
      temporalResolution,
      temporalAggregation: temporalAggregationMethod,
      spatialAggregation: spatialAggregationMethod,
      transform: undefined,
    })
  );

  const results: any[] = (await Promise.all(promises)).filter((data) => data !== null);
  return results.map((uncorrectedPoints, index) => {
    const outputName = breakdownState.outputNames[index];
    const output = getOutput(metadata, outputName);
    // const rawResolution =
    //   output?.data_resolution?.temporal_resolution ?? TemporalResolution.Other;
    // const finalRawDate = new Date(metadata.period.lte);
    // const { points, action } = correctIncompleteTimeseries(
    //   rawPoints,
    //   rawResolution,
    //   temporalResolution,
    //   temporalAggregationMethod,
    //   finalRawDate
    // );
    return {
      name: output?.display_name ?? outputName,
      id: outputName,
      color: colorFromIndex(index),
      points: uncorrectedPoints,
      isDefaultRun: false,
      // correctiveAction: action,
    };
  });
}

async function fetchTimeseriesByQualifiers(
  breakdownState: BreakdownStateQualifiers,
  dataId: string,
  spatialAggregationMethod: AggregationOption,
  temporalAggregationMethod: AggregationOption,
  temporalResolution: TemporalResolutionOption
) {
  const regionId = breakdownState.regionId ?? undefined;
  const { data } = await getQualifierTimeseries(
    dataId,
    breakdownState.modelRunId,
    breakdownState.outputName,
    temporalResolution,
    temporalAggregationMethod,
    spatialAggregationMethod,
    breakdownState.qualifier,
    breakdownState.qualifierValues,
    undefined,
    regionId
  );
  return data.map(({ name, timeseries }, index) => ({
    name,
    id: name,
    color: colorFromIndex(index),
    points: timeseries,
    isDefaultRun: false,
  }));
}

async function fetchTimeseries(
  metadata: Model | Indicator,
  breakdownState: BreakdownState,
  spatialAggregationMethod: AggregationOption,
  temporalAggregationMethod: AggregationOption,
  temporalResolution: TemporalResolutionOption
) {
  const dataId = metadata.data_id;
  if (isBreakdownStateRegions(breakdownState)) {
    return fetchTimeseriesByRegion(
      breakdownState,
      dataId,
      spatialAggregationMethod,
      temporalAggregationMethod,
      temporalResolution
    );
  } else if (isBreakdownStateNone(breakdownState)) {
    return fetchTimeseriesByModelRun(
      breakdownState,
      dataId,
      spatialAggregationMethod,
      temporalAggregationMethod,
      temporalResolution
    );
  } else if (isBreakdownStateYears(breakdownState)) {
    return fetchTimeseriesByYears(
      breakdownState,
      dataId,
      spatialAggregationMethod,
      temporalAggregationMethod,
      temporalResolution
    );
  } else if (isBreakdownStateOutputs(breakdownState)) {
    return fetchTimeseriesByOutputs(
      breakdownState,
      dataId,
      metadata,
      spatialAggregationMethod,
      temporalAggregationMethod,
      temporalResolution
    );
  } else {
    return fetchTimeseriesByQualifiers(
      breakdownState,
      dataId,
      spatialAggregationMethod,
      temporalAggregationMethod,
      temporalResolution
    );
  }
}

/**
 * Fetches the correct timeseries data depending on the breakdown state, and applies any necessary
 * transformations to make sure the "relative to" state is respected.
 */
export default function useTimeseriesDataFromBreakdownState(
  breakdownState: Ref<BreakdownState | null>,
  metadata: Ref<Model | Indicator | null>,
  spatialAggregationMethod: Ref<AggregationOption>,
  temporalAggregationMethod: Ref<AggregationOption>,
  temporalResolution: Ref<TemporalResolutionOption>
) {
  const timeseriesData = ref<Timeseries[]>([]);
  watch(
    [
      metadata,
      breakdownState,
      spatialAggregationMethod,
      temporalAggregationMethod,
      temporalResolution,
    ],
    async (newValues, oldValues, onInvalidate) => {
      if (metadata.value === null || breakdownState.value === null) {
        return;
      }
      let isCancelled = false;
      onInvalidate(() => {
        isCancelled = true;
      });

      // Fetch the correct timeseries depending on the breakdown state, then assign a name, id, and
      //  colour to each timeseries and store it in the `timeseriesData` ref.
      const timeseries = await fetchTimeseries(
        metadata.value,
        breakdownState.value,
        spatialAggregationMethod.value,
        temporalAggregationMethod.value,
        temporalResolution.value
      );
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the fetch results to avoid a
        //  race condition.
        return;
      }
      timeseriesData.value = timeseries;
    }
  );

  // If `shouldDisplayAbsoluteValues` is false, transform the timeseries so that they're displayed
  //  relative to the timeseries with an ID of `baselineTimeseriesId`.
  const timeseriesDataWithRelativeToApplied = computed<Timeseries[]>(() => {
    if (timeseriesData.value.length === 0 || breakdownState.value === null) {
      return [];
    }
    // TODO: Reference series
    // const referencedTimeseriesData =
    //   referenceOptions && referenceOptions.value && referenceOptions.value.length > 0
    //     ? applyReference(
    //         correctedTimeseriesData,
    //         rawTimeseriesData.value,
    //         breakdownOption.value,
    //         referenceOptions.value
    //       )
    //     : correctedTimeseriesData;
    const {
      baselineTimeseriesId: _baselineTimeseriesId,
      shouldDisplayAbsoluteValues,
      shouldUseRelativePercentage,
    } = breakdownState.value.comparisonSettings;
    const baselineTimeseriesId = shouldDisplayAbsoluteValues ? null : _baselineTimeseriesId;
    const { timeseriesData: relativeTimeseriesData } = applyRelativeTo(
      timeseriesData.value,
      baselineTimeseriesId,
      shouldUseRelativePercentage
    );
    // When timeseries are being displayed relative to a baseline timeseries, the baseline will
    //  have a value of 0 at every point, so remove it from the visible timeseries
    return relativeTimeseriesData.filter((timeseries) => timeseries.id !== baselineTimeseriesId);
  });

  return {
    timeseriesData: timeseriesDataWithRelativeToApplied,
  };
}
