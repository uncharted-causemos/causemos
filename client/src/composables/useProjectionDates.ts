import { Ref, computed, ref } from 'vue';
import { getTimestampMillis, getYearFromTimestamp } from '@/utils/date-util';
import { TimeseriesPoint } from '@/types/Timeseries';

export const DEFAULT_EARLIEST_YEAR = 1990;
export const DEFAULT_LAST_YEAR = 2025;
// The number of years that should be selectable before the earliest (and after the last) year
//  found in the data.
// For example, if the earliest year in the data is 1985 and BUFFER_YEAR_COUNT is 10, the user
//  should be able to select years starting in 1975.
const BUFFER_YEAR_COUNT = 10;

export default function useProjectionDates(historicalTimeseries: Ref<TimeseriesPoint[][]>) {
  // Returns DEFAULT_EARLIEST_YEAR or the earliest year in the data minus BUFFER_YEAR_COUNT,
  //  whichever is earlier.
  const earliestSelectableYear = computed(() => {
    const earliestTimestamps = historicalTimeseries.value
      .map((timeseries) => timeseries[0]?.timestamp ?? null)
      .filter((timestamp) => timestamp !== null);
    if (earliestTimestamps.length === 0) return DEFAULT_EARLIEST_YEAR;
    const earliestTimestamp = Math.min(...earliestTimestamps);
    const earliestYear = getYearFromTimestamp(earliestTimestamp);
    return Math.min(earliestYear - BUFFER_YEAR_COUNT, DEFAULT_EARLIEST_YEAR);
  });
  // Returns DEFAULT_LAST_YEAR or the last year in the data plus BUFFER_YEAR_COUNT, whichever is
  //  later.
  const lastSelectableYear = computed(() => {
    const lastTimestamps = historicalTimeseries.value
      .map((timeseries) => timeseries[timeseries.length - 1]?.timestamp ?? null)
      .filter((timestamp) => timestamp !== null);
    if (lastTimestamps.length === 0) return DEFAULT_LAST_YEAR;
    const lastTimestamp = Math.max(...lastTimestamps);
    const lastYear = getYearFromTimestamp(lastTimestamp);
    return Math.max(lastYear + BUFFER_YEAR_COUNT, DEFAULT_LAST_YEAR);
  });
  const projectionStartMonth = ref(0);
  const projectionStartYear = ref(DEFAULT_EARLIEST_YEAR);
  const projectionEndMonth = ref(0);
  const projectionEndYear = ref(DEFAULT_LAST_YEAR);
  const areProjectionDatesValid = computed(
    () =>
      getTimestampMillis(projectionStartYear.value, projectionStartMonth.value) <=
      getTimestampMillis(projectionEndYear.value, projectionEndMonth.value)
  );
  const projectionStartTimestamp = ref(
    getTimestampMillis(projectionStartYear.value, projectionStartMonth.value)
  );
  const projectionEndTimestamp = ref(
    getTimestampMillis(projectionEndYear.value, projectionEndMonth.value)
  );
  const saveProjectionDates = () => {
    projectionStartTimestamp.value = getTimestampMillis(
      projectionStartYear.value,
      projectionStartMonth.value
    );
    projectionEndTimestamp.value = getTimestampMillis(
      projectionEndYear.value,
      projectionEndMonth.value
    );
  };

  return {
    projectionStartYear,
    projectionStartMonth,
    projectionStartTimestamp,
    projectionEndYear,
    projectionEndMonth,
    projectionEndTimestamp,
    lastSelectableYear,
    earliestSelectableYear,
    areProjectionDatesValid,
    saveProjectionDates,
  };
}
