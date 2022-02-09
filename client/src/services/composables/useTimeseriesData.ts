import API from '@/api/api';
import { Datacube } from '@/types/Datacube';
import { BreakdownData } from '@/types/Datacubes';
import {
  AggregationOption,
  DataTransform,
  SpatialAggregationLevel,
  TemporalAggregationLevel,
  TemporalResolutionOption,
  TemporalResolution,
  ReferenceSeriesOption,
  SPLIT_BY_VARIABLE
} from '@/types/Enums';
import { ModelRun } from '@/types/ModelRun';
import { QualifierTimeseriesResponse, Timeseries, TimeseriesPoint } from '@/types/Timeseries';
import { REGION_ID_DELIMETER } from '@/utils/admin-level-util';
import { colorFromIndex } from '@/utils/colors-util';
import { getYearFromTimestamp } from '@/utils/date-util';
import { applyReference, applyRelativeTo, breakdownByYear, mapToBreakdownDomain } from '@/utils/timeseries-util';
import _ from 'lodash';
import { computed, Ref, ref, shallowRef, watch, watchEffect } from 'vue';
import { getQualifierTimeseries, getRawTimeseriesData, getRawTimeseriesDataBulk } from '../outputdata-service';
import { correctIncompleteTimeseriesLists } from '@/utils/incomplete-data-detection';


const applyBreakdown = (
  timeseriesData: Timeseries[],
  breakdownOption: string | null,
  selectedYears: Set<string>
): Timeseries[] => {
  if (
    breakdownOption !== TemporalAggregationLevel.Year ||
    timeseriesData.length !== 1
  ) {
    return timeseriesData;
  }
  const brokenDownByYear = breakdownByYear(timeseriesData);

  return Object.keys(brokenDownByYear)
    .filter(year => selectedYears.has(year))
    .map((year, index) => {
      const points = brokenDownByYear[year];
      // Depending on the selected breakdown option, timestamp values may need to be mapped
      //  from the standard epoch format, e.g. `1451606400` for `Dec 31, 2015 @ 7pm`
      //  to a less specific domain like "the month's index", e.g. `1` for `February`
      const mappedToBreakdownDomain = mapToBreakdownDomain(points);
      return {
        name: year,
        id: year,
        color: colorFromIndex(index),
        points: mappedToBreakdownDomain,
        isDefaultRun: timeseriesData[0].isDefaultRun
      };
    });
};

/**
 * Takes a data ID, a list of model run IDs, and a colouring function,
 * fetches the timeseries data for each run, then assigns a colour to
 * each timeseries using the colouring function, returning the resulting
 * list of Timeseries objects.
 */
export default function useTimeseriesData(
  metadata: Ref<Datacube | null>,
  modelRunIds: Ref<string[]>,
  selectedTemporalResolution: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedSpatialAggregation: Ref<string>,
  breakdownOption: Ref<string | null>,
  selectedTimestamp: Ref<number | null>,
  selectedTransform: Ref<DataTransform>,
  onNewLastTimestamp: (lastTimestamp: number) => void,
  regionIds: Ref<string[]>,
  selectedQualifierValues: Ref<Set<string>>,
  initialSelectedYears: Ref<string[]>,
  showPercentChange: Ref<boolean>,
  activeFeature: Ref<string>,
  modelRuns?: Ref<ModelRun[]>,
  referenceOptions?: Ref<string[]>,
  isRawDataResolution?: Ref<Boolean>
) {
  const rawTimeseriesData = ref<Timeseries[]>([]);
  const referenceTimeseries = ref<Timeseries[]>([]);
  const relativeTo = ref<string | null>(null);
  const selectedYears = shallowRef(new Set<string>());

  const setRelativeTo = (newValue: string | null) => {
    relativeTo.value = newValue;
  };

  const timeseriesData = computed(
    () => processedTimeseriesData.value.timeseriesData
  );

  const allTimeseriesData = computed(() =>
    timeseriesData.value.concat(referenceTimeseries.value)
  );

  const visibleTimeseriesData = computed(() =>
    allTimeseriesData.value.filter(
      timeseries => timeseries.id !== relativeTo.value
    )
  );

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

  const temporalBreakdownData = computed<BreakdownData | null>(() => {
    if (rawTimeseriesData.value.length === 0) return null;
    const result: {
      id: string;
      values: { [timeseriesId: string]: number };
    }[] = [];
    // When "split by year" is active, we have to use the timeseries data for
    //  the entire selected run, otherwise we'll only have breakdown data
    //  entries for the selected years and won't be able to select any others
    const timeseriesListToUse =
      breakdownOption.value === TemporalAggregationLevel.Year
        ? rawTimeseriesData.value
        : timeseriesData.value;
    timeseriesListToUse.forEach(({ id: timeseriesId, points }) => {
      // Group points by year
      const brokenDownByYear = _.groupBy(points, point =>
        getYearFromTimestamp(point.timestamp)
      );
      // Aggregate points to get one value for each year
      const reduced = Object.entries(brokenDownByYear).map(([year, values]) => {
        const sum = _.sumBy(values, 'value');
        const aggregateValue =
          selectedTemporalAggregation.value === AggregationOption.Mean
            ? sum / values.length
            : sum;
        return {
          year,
          value: aggregateValue
        };
      });
      // Restructure into the BreakdownData format
      reduced.forEach(({ year, value }) => {
        // If "split by year" is active we want to use each entry's year as its
        //  ID so that it's coloured correctly in the breakdown pane. Also,
        //  they all come from the same timeseries and would otherwise have non
        //  unique IDs.
        const idToUse =
          breakdownOption.value === TemporalAggregationLevel.Year
            ? year
            : timeseriesId;
        const entryForThisYear = result.find(entry => entry.id === year);
        if (entryForThisYear === undefined) {
          // Add an entry for this year
          result.push({
            id: year,
            values: { [idToUse]: value }
          });
        } else {
          // Add a value to this year's entry
          entryForThisYear.values[idToUse] = value;
        }
      });
    });

    const sortedByDescendingYear = result.sort((a, b) => {
      // localeCompare will return 1 if `a` should come after `b`, so we negate the result to
      //  achieve descending order (e.g. 2020, 2019, 2018, ...)
      return -a.id.localeCompare(b.id, undefined, { numeric: true });
    });

    return {
      Year: sortedByDescendingYear
    };
  });

  const toggleIsYearSelected = (year: string) => {
    const isYearSelected = selectedYears.value.has(year);
    const updatedList = _.clone(selectedYears.value);

    if (isYearSelected) {
      // If year is currently selected, remove it from the list of
      //  selected years.
      updatedList.delete(year);
    } else {
      // Else add it to the list of selected years.
      updatedList.add(year);
    }

    // Assign new object to selectedYears.value to trigger reactivity updates.
    selectedYears.value = updatedList;
  };

  const processedTimeseriesData = computed(() => {
    if (rawTimeseriesData.value.length === 0) {
      return {
        baselineMetadata: null,
        timeseriesData: []
      };
    }

    const breakdownTimeseriesData = applyBreakdown(
      rawTimeseriesData.value,
      breakdownOption.value,
      selectedYears.value
    );

    const output = metadata.value?.outputs.find(output => output.name === activeFeature.value);
    const rawResolution = output?.data_resolution?.temporal_resolution ?? TemporalResolution.Other;
    const finalRawDate = new Date(metadata.value?.period?.lte ?? 0);

    const correctedTimeseriesData = correctIncompleteTimeseriesLists(breakdownTimeseriesData,
      rawResolution, temporalRes.value as TemporalResolutionOption,
      temporalAgg.value as AggregationOption, finalRawDate);

    const referencedTimeseriesData = referenceOptions && referenceOptions.value && referenceOptions.value.length > 0
      ? applyReference(correctedTimeseriesData, rawTimeseriesData.value, breakdownOption.value, referenceOptions.value)
      : correctedTimeseriesData;

    const relativeTimeseriesData = applyRelativeTo(referencedTimeseriesData, relativeTo.value, showPercentChange.value);
    return relativeTimeseriesData;
  });

  watchEffect(onInvalidate => {
    const datacubeMetadata = metadata.value;
    if (modelRunIds.value.length === 0 || datacubeMetadata === null) {
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

      const allRegionIds = [...regionIds.value];

      if (referenceOptions !== undefined && breakdownOption.value === SpatialAggregationLevel.Region) {
        // 1. filter out aggregated types
        // 2. push the non-aggregated reference regions.
        referenceOptions.value
          .filter(region => !Object.values(ReferenceSeriesOption).includes(region as ReferenceSeriesOption))
          .forEach(region => allRegionIds.push(region));
      }

      if (breakdownOption.value === SpatialAggregationLevel.Region) {
        const runId = modelRunIds.value[0];
        promises = isRawDataResolution?.value
          ? [getRawTimeseriesDataBulk({ dataId, runId, outputVariable: activeFeature.value, spatialAgg }, allRegionIds).then(result => ({ data: result }))]
          : [API.post('maas/output/bulk-timeseries', { region_ids: allRegionIds }, {
              params: {
                data_id: dataId,
                run_id: runId,
                feature: activeFeature.value,
                resolution: temporalRes.value,
                temporal_agg: temporalAgg.value,
                spatial_agg: spatialAgg,
                transform: transform
              }
            }).catch(() => {
              console.error(`Failed to fetch timeseries for ${allRegionIds.join(' ')}`);
              return null;
            })];
      } else if (
        breakdownOption.value === null ||
        breakdownOption.value === TemporalAggregationLevel.Year
      ) {
        // If no regions are selected, pass "undefined" as the region_id
        //  to get the aggregated timeseries for all regions. Otherwise,
        //  fetch the timeseries for the selected region
        // ASSUMPTION: when split by region is not active, only one
        //  region is selected at a time
        const regionId =
          regionIds.value.length > 0 ? regionIds.value[0] : undefined;
        promises = modelRunIds.value.map(runId => {
          return isRawDataResolution?.value
            ? getRawTimeseriesData({ dataId, runId, regionId: (regionId || ''), outputVariable: activeFeature.value, spatialAgg }).then(result => ({ data: result }))
            : API.get('maas/output/timeseries', {
              params: {
                data_id: dataId,
                run_id: runId,
                feature: activeFeature.value,
                resolution: temporalRes.value,
                temporal_agg: temporalAgg.value,
                spatial_agg: spatialAgg,
                transform: transform,
                region_id: regionId
              }
            });
        });
      } else if (
        breakdownOption.value === SPLIT_BY_VARIABLE
      ) {
        return;
      } else {
        // Breakdown by qualifier
        // ASSUMPTION: we'll only need to fetch the qualifier timeseries when
        //  exactly one model run is selected
        const regionId =
          regionIds.value.length > 0 ? regionIds.value[0] : undefined;
        promises = [
          getQualifierTimeseries(
            dataId,
            modelRunIds.value[0],
            activeFeature.value,
            temporalRes.value,
            temporalAgg.value,
            spatialAgg,
            breakdownOption.value,
            Array.from(selectedQualifierValues.value),
            transform,
            regionId
          )
        ];
      }
      const fetchResults = (await Promise.all(promises))
        .filter(response => response !== null)
        .map((response: any) => response.data);
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      // Assign a name, id, and colour to each timeseries and store it in the
      //  `rawTimeseriesData` ref
      if (breakdownOption.value === SpatialAggregationLevel.Region) {
        rawTimeseriesData.value = fetchResults[0].map((regionalTimeseries: {region_id: string; timeseries: TimeseriesPoint[]}, index: number) => {
          // Take the last segment of the region ID to get its display name
          const name =
            allRegionIds[index]?.split(REGION_ID_DELIMETER).pop() ??
            allRegionIds[index];
          const isDefaultRun = modelRuns && modelRuns.value[index] ? modelRuns.value[index].is_default_run : false;
          const id = allRegionIds[index];
          const color = colorFromIndex(index);
          const points: TimeseriesPoint[] = regionalTimeseries.timeseries;
          return { name, id, color, points, isDefaultRun };
        });
      } else if (
        breakdownOption.value === TemporalAggregationLevel.Year ||
        breakdownOption.value === null
      ) {
        // use run names if available
        const modeRunNames = modelRuns && modelRuns.value && modelRuns.value.length > 0 ? modelRuns?.value.map(r => r.name) : modelRunIds.value;
        const defaultRunData = modelRuns && modelRuns.value && modelRuns.value.length > 0
          ? modelRuns?.value.map(r => r.is_default_run) : new Array(modelRunIds.value.length).fill(false);

        rawTimeseriesData.value = fetchResults.map((points, index) => {
          const name = modeRunNames[index] ?? 'no name: ' + index;
          const id = modelRunIds.value[index];
          const color = colorFromIndex(index);
          const isDefaultRun = defaultRunData[index] ?? 0;
          return { name, id, color, points, isDefaultRun };
        });
      } else {
        // Breakdown by qualifier
        const options: QualifierTimeseriesResponse[] = fetchResults[0];
        rawTimeseriesData.value = options.map(({ name, timeseries }, index) => {
          return {
            name, // TODO: look up display name
            id: name,
            color: colorFromIndex(index),
            points: timeseries,
            isDefaultRun: false
          };
        });
      }
    }
    onInvalidate(() => {
      isCancelled = true;
    });

    fetchTimeseries();
  });

  watchEffect(() => {
    // Don't reset selected year list until data has loaded, in case it gets
    //  loaded from an insight and will be valid once timeseriesData has been
    //  populated.
    const dataHasLoaded =
      rawTimeseriesData.value.length > 0 && timeseriesData.value.length > 0;
    if (!dataHasLoaded) return;

    // If no timeseries has an ID of `year`, then remove it from the list of
    //  selected years.
    // This also means that all years will be deselected when the breakdown
    //  option changes (except in the extreme edge case where a region/model
    //  run/qualifier has a year as its ID).
    const doesYearExistInData = (year: string) =>
      timeseriesData.value.some(({ id }) => id === year);
    const filteredSelectedYears = new Set<string>();
    Array.from(selectedYears.value.values())
      .filter(doesYearExistInData)
      .forEach(year => {
        filteredSelectedYears.add(year);
      });
    selectedYears.value = filteredSelectedYears;
  });

  watchEffect(() => {
    const filteredSelectedYears = new Set<string>();

    if (initialSelectedYears.value && initialSelectedYears.value.length > 0) {
      initialSelectedYears.value.forEach(year => {
        filteredSelectedYears.add(year);
      });
    }

    selectedYears.value = filteredSelectedYears;
  });

  // Whenever the selected breakdown option or timeseries data changes,
  //  reselect the last timestamp across all series
  watch(
    () => [breakdownOption.value, processedTimeseriesData.value],
    () => {
      const allTimestamps = processedTimeseriesData.value.timeseriesData
        .map(timeseries => timeseries.points)
        .flat()
        .map(point => point.timestamp);
      // Don't call "onNewLastTimestamp" callback if the previously selected timestamp
      //  still exists within the new timeseries's range.
      if (
        selectedTimestamp.value !== null &&
        allTimestamps.includes(selectedTimestamp.value)
      ) {
        return;
      }
      const lastTimestamp = _.max(allTimestamps);
      if (lastTimestamp !== undefined) {
        onNewLastTimestamp(lastTimestamp);
      }
    }
  );

  // Whenever the selected runs change, reset "relative to" state
  //  and selected breakdown option
  watchEffect(() => {
    // Don't reset relativeTo until data has loaded, in case relativeTo is
    //  loaded from an insight and will be valid once timeseriesData has been
    //  populated.
    const dataHasLoaded =
      rawTimeseriesData.value.length > 0 && timeseriesData.value.length > 0;
    // If no timeseries has an ID of `relativeTo`, then `relativeTo` cannot
    //   be used to select a valid baseline and shouldbe reset to `null`.
    const doesRelativeToExistInData = timeseriesData.value.some(
      ({ id }) => id === relativeTo.value
    );
    const shouldResetRelativeTo = dataHasLoaded && !doesRelativeToExistInData;
    if (shouldResetRelativeTo) {
      relativeTo.value = null;
    }
  });

  return {
    timeseriesData,
    visibleTimeseriesData,
    baselineMetadata: computed(
      () => processedTimeseriesData.value.baselineMetadata
    ),
    relativeTo,
    setRelativeTo,
    temporalBreakdownData,
    selectedYears,
    toggleIsYearSelected
  };
}
