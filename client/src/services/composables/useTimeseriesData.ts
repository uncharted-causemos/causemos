import API from '@/api/api';
import { Datacube } from '@/types/Datacube';
import { BreakdownData } from '@/types/Datacubes';
import { AggregationOption, TemporalResolutionOption } from '@/types/Enums';
import { Timeseries } from '@/types/Timeseries';
import { colorFromIndex } from '@/utils/colors-util';
import { getMonthFromTimestamp, getYearFromTimestamp } from '@/utils/date-util';
import _ from 'lodash';
import { computed, Ref, ref, watch, watchEffect } from 'vue';

const applyBreakdown = (
  timeseriesData: Timeseries[],
  breakdownOption: string | null
): Timeseries[] => {
  if (breakdownOption === null || timeseriesData.length !== 1) {
    return timeseriesData;
  }
  // FIXME: Still need to add logic for breaking down timeseries by other
  //  temporal aggregation levels and by other facets of the data
  const onlyTimeseries = timeseriesData[0].points;
  const brokenDownByYear = _.groupBy(onlyTimeseries, point =>
    getYearFromTimestamp(point.timestamp)
  );
  return Object.keys(brokenDownByYear)
    .slice(-5) // FIXME: remove -5 slice, replace it with aggregation pane checkbox state
    .map((year, index) => {
      const points = brokenDownByYear[year];
      // Depending on the selected breakdown option, timestamp values may need to be mapped
      //  from the standard epoch format, e.g. `1451606400` for `Dec 31, 2015 @ 7pm`
      //  to a less specific domain like "the month's index", e.g. `1` for `February`
      const mappedToBreakdownDomain = points.map(({ value, timestamp }) => ({
        value,
        timestamp: getMonthFromTimestamp(timestamp)
      }));
      return {
        name: year,
        id: year,
        color: colorFromIndex(index),
        points: mappedToBreakdownDomain
      };
    });
};

const applyRelativeTo = (
  timeseriesData: Timeseries[],
  relativeTo: string | null
) => {
  const baselineData = timeseriesData.find(
    timeseries => timeseries.id === relativeTo
  );
  if (
    relativeTo === null ||
    timeseriesData.length < 2 ||
    baselineData === undefined
  ) {
    return {
      baselineMetadata: null,
      timeseriesData
    };
  }
  // User wants to display data relative to one run
  const returnValue: Timeseries[] = [];
  timeseriesData.forEach(timeseries => {
    // Adjust values
    const { id, name, color, points } = timeseries;
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
      id,
      name,
      color,
      points: adjustedPoints
    });
  });
  const baselineMetadata = {
    name: baselineData.name,
    color: baselineData.color
  };
  return { baselineMetadata, timeseriesData: returnValue };
};

/**
 * Takes a data ID, a list of model run IDs, and a colouring function,
 * fetches the timeseries data for each run, then assigns a colour to
 * each timeseries using the colouring function, returning the resulting
 * list of Timeseries objects.
 */
export default function useTimeseriesData(
  metadata: Ref<Datacube | null>,
  dataId: Ref<string>,
  modelRunIds: Ref<string[]>,
  selectedTemporalResolution: Ref<string>,
  selectedTemporalAggregation: Ref<string>,
  selectedSpatialAggregation: Ref<string>,
  breakdownOption: Ref<string | null>,
  selectedTimestamp: Ref<number | null>,
  onNewLastTimestamp: (lastTimestamp: number) => void
) {
  const rawTimeseriesData = ref<Timeseries[]>([]);

  watchEffect(onInvalidate => {
    const modelMetadata = metadata.value;
    if (
      modelRunIds.value.length === 0 ||
      modelMetadata === null
    ) {
      // Don't have the information needed to fetch the data
      return;
    }
    const activeFeature = modelMetadata.default_feature ?? '';
    const activeDataId = dataId.value.length > 0 ? dataId.value : modelMetadata.data_id;
    let isCancelled = false;
    async function fetchTimeseries() {
      // Fetch the timeseries data for each modelRunId
      const temporalRes =
        selectedTemporalResolution.value !== ''
          ? selectedTemporalResolution.value
          : TemporalResolutionOption.Month;
      const temporalAgg =
        selectedTemporalAggregation.value !== ''
          ? selectedTemporalAggregation.value
          : AggregationOption.Sum;
      const spatialAgg =
        selectedSpatialAggregation.value !== ''
          ? selectedSpatialAggregation.value
          : AggregationOption.Mean;

      const promises = modelRunIds.value.map(runId =>
        API.get('maas/output/timeseries', {
          params: {
            data_id: activeDataId,
            run_id: runId,
            feature: activeFeature,
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
      // Assign a name, id, and colour to each timeseries and store it in the
      //  `rawTimeseriesData` ref
      rawTimeseriesData.value = fetchResults.map((points, index) => {
        const name = `Run ${index}`;
        const id = modelRunIds.value[index];
        const color = colorFromIndex(index);
        return { name, id, color, points };
      });
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchTimeseries();
  });

  const relativeTo = ref<string | null>(null);
  // Whenever the selected runs change, reset "relative to" state
  //  and selected breakdown option
  watch(
    () => [modelRunIds.value],
    () => {
      relativeTo.value = null;
      breakdownOption.value = null;
    },
    {
      immediate: true
    }
  );

  const temporalBreakdownData = computed<BreakdownData | null>(() => {
    if (rawTimeseriesData.value.length === 0) return null;
    const result: {
      id: string;
      values: { [modelRunId: string]: number };
    }[] = [];
    rawTimeseriesData.value.map(({ points }, index) => {
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
      const modelRunId = modelRunIds.value[index];
      reduced.forEach(({ year, value }) => {
        const entryForThisYear = result.find(entry => entry.id === year);
        if (entryForThisYear === undefined) {
          // Add an entry for this year
          result.push({
            id: year,
            values: { [modelRunId]: value }
          });
        } else {
          // Add a value to this year's entry
          entryForThisYear.values[modelRunId] = value;
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

  const processedTimeseriesData = computed(() => {
    if (rawTimeseriesData.value.length === 0) {
      return {
        baselineMetadata: null,
        timeseriesData: []
      };
    }
    const afterApplyingBreakdown = applyBreakdown(
      rawTimeseriesData.value,
      breakdownOption.value
    );
    return applyRelativeTo(afterApplyingBreakdown, relativeTo.value);
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

  const setRelativeTo = (newValue: string | null) => {
    relativeTo.value = newValue;
  };

  const timeseriesData = computed(
    () => processedTimeseriesData.value.timeseriesData
  );

  return {
    timeseriesData,
    visibleTimeseriesData: computed(() =>
      timeseriesData.value.filter(
        timeseries => timeseries.id !== relativeTo.value
      )
    ),
    baselineMetadata: computed(
      () => processedTimeseriesData.value.baselineMetadata
    ),
    relativeTo,
    setRelativeTo,
    temporalBreakdownData
  };
}
