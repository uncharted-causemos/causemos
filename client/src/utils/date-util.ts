import { TemporalResolutionOption } from '@/types/Enums';

export const EPOCH_YEAR = 1970;

export const getYearFromTimestamp = (timestamp: number) => {
  return new Date(timestamp).getUTCFullYear();
};

export const getMonthFromTimestamp = (timestamp: number) => {
  return new Date(timestamp).getUTCMonth();
};

export const getTimestampAfterMonths = (timestamp: number, monthsElapsed: number) => {
  const month = getMonthFromTimestamp(timestamp);
  const year = getYearFromTimestamp(timestamp);
  if (monthsElapsed < 0) {
    return subtractMonths(month, year, -monthsElapsed);
  }
  return addMonths(month, year, monthsElapsed);
};

const addMonths = (month: number, year: number, monthsToAdd: number) => {
  const newMonth = (month + monthsToAdd) % 12;
  const yearsToAdd = (month + monthsToAdd - newMonth) / 12;
  const newYear = year + yearsToAdd;
  return getTimestampMillis(newYear, newMonth);
};

const subtractMonths = (month: number, year: number, monthsToSubtract: number) => {
  let newMonth = month - monthsToSubtract;
  let yearsToSubtract = 0;
  while (newMonth < 0) {
    newMonth += 12;
    yearsToSubtract += 1;
  }
  const newYear = year - yearsToSubtract;
  return getTimestampMillis(newYear, newMonth);
};

/** Returns a unix timestamp in milliseconds */
export const getTimestampMillis = (year: number, month: number) => {
  return new Date(Date.UTC(year, month)).getTime();
};

/**
 *  Returns a unix timestamp in milliseconds from a given year
 * @param year year
 */
export const getTimestampMillisFromYear = (year: number) => {
  return new Date(Date.UTC(year, 0)).getTime();
};

/**
 * For given timestamp, returns the number of months passed since 00:00:00 UTC on 1 January 1970
 * @param timestamp An unix timestamp in milliseconds
 */
export const getNumberOfMonthsSinceEpoch = (timestamp: number) => {
  const year = getYearFromTimestamp(timestamp);
  const month = getMonthFromTimestamp(timestamp);
  return (year - EPOCH_YEAR) * 12 + month;
};

/**
 * Returns the unix timestamp in milliseconds
 * @param nMonths Number of months since unix epoch time
 */
export const getTimestampFromNumberOfMonths = (nMonths: number) => {
  const year = Math.floor(nMonths / 12) + EPOCH_YEAR;
  const month = (12 + (nMonths % 12)) % 12;
  return getTimestampMillis(year, month);
};

/**
 * Rounds a timestamp to the nearest month.
 * @param timestamp The timestamp to be snapped
 * @returns An object containing the month and year of the nearest month
 */
export const snapTimestampToNearestMonth = (timestamp: number) => {
  // "Floor" timestamp to the month (and year) that it falls in
  const month = getMonthFromTimestamp(timestamp);
  const year = getYearFromTimestamp(timestamp);
  const thisMonthTimestamp = getTimestampMillis(year, month);
  // Get the timestamp at the start of next month
  const nextMonthTimestamp = addMonths(month, year, 1);
  // Return the month and year of whichever is closer
  const distanceToNextMonth = Math.abs(nextMonthTimestamp - timestamp);
  const distanceToThisMonth = Math.abs(thisMonthTimestamp - timestamp);
  if (distanceToNextMonth < distanceToThisMonth) {
    return nextMonthTimestamp;
  }
  return thisMonthTimestamp;
};

/**
 * Return functions to convert timestamps to yearly or monthly steps based on the provided data resolution option.
 * @param dataTemporalResolution - Data temporal resolution option: 'TemporalResolutionOption.Year' or 'TemporalResolutionOption.Month'.
 * @returns Conversion functions for timestamps based on the resolution.
 */
export const getTimestampConvertFunctions = (
  dataTemporalResolution: TemporalResolutionOption.Year | TemporalResolutionOption.Month
) => {
  const fromTimestamp =
    dataTemporalResolution === TemporalResolutionOption.Year
      ? getYearFromTimestamp
      : getNumberOfMonthsSinceEpoch;
  const toTimestamp =
    dataTemporalResolution === TemporalResolutionOption.Year
      ? getTimestampMillisFromYear
      : getTimestampFromNumberOfMonths;
  return {
    fromTimestamp,
    toTimestamp,
  };
};

/**
 * Calculate the timestamp that is `interval` units of time ahead of the given `timestamp`
 * based on the specified temporal resolution.
 * @param timestamp - Starting timestamp.
 * @param interval - Number of units to advance by.
 * @param temporalResolution - Temporal resolution option: 'TemporalResolutionOption.Year' or 'TemporalResolutionOption.Month'.
 * @returns Timestamp that is `interval` units ahead of the input `timestamp`.
 */
export const calculateNextTimestamp = (
  timestamp: number,
  interval: number,
  temporalResolution: TemporalResolutionOption.Month | TemporalResolutionOption.Year
) => {
  const { fromTimestamp, toTimestamp } = getTimestampConvertFunctions(temporalResolution);
  return toTimestamp(fromTimestamp(timestamp) + interval);
};

/**
 * Generates a human-readable label for a time interval based on the number of steps and temporal resolution.
 * @param steps - Number of steps in the interval.
 * @param temporalResolution - Temporal resolution option: 'TemporalResolutionOption.Year' or 'TemporalResolutionOption.Month'.
 * @returns String representation of the time interval, e.g., 'monthly', 'quarterly', 'annual', 'biennial', or 'X months/years'.
 */
export const getFormattedTimeInterval = (
  steps: number,
  temporalResolution: TemporalResolutionOption
) => {
  if (temporalResolution === TemporalResolutionOption.Month) {
    if (steps === 1) return 'monthly';
    if (steps === 3) return 'quarterly';
    if (steps === 12) return 'annual';
    return `${steps} months`;
  } else if (temporalResolution === TemporalResolutionOption.Year) {
    if (steps === 1) return 'annual';
    if (steps === 2) return 'biennial';
    return `${steps} years`;
  }
  return '';
};
