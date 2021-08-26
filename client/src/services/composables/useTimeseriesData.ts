import API from '@/api/api';
import { Datacube } from '@/types/Datacube';
import { BreakdownData } from '@/types/Datacubes';
import {
  AggregationOption,
  TemporalResolutionOption,
  SpatialAggregationLevel,
  TemporalAggregationLevel
} from '@/types/Enums';
import { QualifierTimeseriesResponse, Timeseries } from '@/types/Timeseries';
import { REGION_ID_DELIMETER } from '@/utils/admin-level-util';
import { colorFromIndex } from '@/utils/colors-util';
import { getMonthFromTimestamp, getYearFromTimestamp } from '@/utils/date-util';
import { applyRelativeTo } from '@/utils/timeseries-util';
import _ from 'lodash';
import { computed, Ref, ref, shallowRef, watch, watchEffect } from 'vue';
import { getQualifierTimeseries } from '../new-datacube-service';
import useActiveDatacubeFeature from './useActiveDatacubeFeature';

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
  const onlyTimeseries = timeseriesData[0].points;
  const brokenDownByYear = _.groupBy(onlyTimeseries, point =>
    getYearFromTimestamp(point.timestamp)
  );
  return Object.keys(brokenDownByYear)
    .filter((year) => selectedYears.has(year))
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
  onNewLastTimestamp: (lastTimestamp: number) => void,
  regionIds: Ref<string[]>,
  selectedQualifierValues: Ref<Set<string>>
) {
  const rawTimeseriesData = ref<Timeseries[]>([]);
  const { activeFeature } = useActiveDatacubeFeature(metadata);

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

      let promises: Promise<{ data: any } | null>[] = [];
      if (breakdownOption.value === SpatialAggregationLevel.Region) {
        promises = regionIds.value.map(regionId => {
          return API.get('maas/output/timeseries', {
            params: {
              data_id: dataId,
              run_id: modelRunIds.value[0],
              feature: activeFeature.value,
              resolution: temporalRes,
              temporal_agg: temporalAgg,
              spatial_agg: spatialAgg,
              region_id: regionId
            }
          }).catch(() => {
            // FIXME: we're getting way more regions back from the hierarchy endpoint
            //  than we seemingly have data for
            console.error(`Failed to fetch timeseries for ${regionId}`);
            return null;
          });
        });
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
          return API.get('maas/output/timeseries', {
            params: {
              data_id: dataId,
              run_id: runId,
              feature: activeFeature.value,
              resolution: temporalRes,
              temporal_agg: temporalAgg,
              spatial_agg: spatialAgg,
              region_id: regionId
            }
          });
        });
      } else {
        // Breakdown by qualifier
        // ASSUMPTION: we'll only need to fetch the qualifier timeseries when
        //  exactly one model run is selected
        promises = [
          getQualifierTimeseries(
            dataId,
            modelRunIds.value[0],
            activeFeature.value,
            temporalRes,
            temporalAgg,
            spatialAgg,
            breakdownOption.value,
            Array.from(selectedQualifierValues.value)
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
        rawTimeseriesData.value = fetchResults.map((points, index) => {
          // Take the last segment of the region ID to get its display name
          const name =
            regionIds.value[index].split(REGION_ID_DELIMETER).pop() ??
            regionIds.value[index];
          const id = regionIds.value[index];
          const color = colorFromIndex(index);
          return { name, id, color, points };
        });
      } else if (
        breakdownOption.value === TemporalAggregationLevel.Year ||
        breakdownOption.value === null
      ) {
        rawTimeseriesData.value = fetchResults.map((points, index) => {
          const name = `Run ${index}`;
          const id = modelRunIds.value[index];
          const color = colorFromIndex(index);
          return { name, id, color, points };
        });
      } else {
        // Breakdown by qualifier
        const options: QualifierTimeseriesResponse[] = fetchResults[0];
        rawTimeseriesData.value = options.map(({ name, timeseries }, index) => {
          return {
            name, // TODO: look up display name
            id: name,
            color: colorFromIndex(index),
            points: timeseries
          };
        });
      }
    }
    onInvalidate(() => {
      isCancelled = true;
    });

    fetchTimeseries();
  });

  const relativeTo = ref<string | null>(null);

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
        const timeseriesId = breakdownOption.value === TemporalAggregationLevel.Year
          ? year
          : modelRunId;
        if (entryForThisYear === undefined) {
          // Add an entry for this year
          result.push({
            id: year,
            values: { [timeseriesId]: value }
          });
        } else {
          // Add a value to this year's entry
          entryForThisYear.values[timeseriesId] = value;
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


  const selectedYears = shallowRef(new Set<string>());
  watchEffect(() => {
    // Don't reset selected year list until data has loaded, in case it gets
    //  loaded from an insight and will be valid once timeseriesData has been
    //  populated.
    const dataHasLoaded =
      rawTimeseriesData.value.length > 0 && timeseriesData.value.length > 0;
    if (!dataHasLoaded || breakdownOption.value !== TemporalAggregationLevel.Year) {
      return;
    }
    // If no timeseries has an ID of `year`, then remove it from the list of
    //  selected years
    const doesYearExistInData = (year: string) => timeseriesData.value.some(
      ({ id }) => id === year
    );
    const filteredSelectedYears = new Set<string>();
    Array.from(selectedYears.value.values())
      .filter(doesYearExistInData)
      .forEach(year => {
        filteredSelectedYears.add(year);
      });
    selectedYears.value = filteredSelectedYears;
  });
  const isMultiSelectionAllowed = computed(
    () => breakdownOption.value === TemporalAggregationLevel.Year
  );
  const toggleIsYearSelected = (year: string) => {
    const isYearSelected = selectedYears.value.has(
      year
    );
    const updatedList = _.clone(selectedYears.value);


    if (isYearSelected) {
      // If year is currently selected, remove it from the list of
      //  selected years.
      updatedList.delete(year);
    } else if (isMultiSelectionAllowed.value) {
      // Else if multiple years can be selected add it to the list of selected years.
      updatedList.add(year);
    } else {
      // Otherwise, replace the list of selected years with this year.
      updatedList.clear();
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
    const afterApplyingBreakdown = applyBreakdown(
      rawTimeseriesData.value,
      breakdownOption.value,
      selectedYears.value
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
    temporalBreakdownData,
    selectedYears,
    toggleIsYearSelected
  };
}
