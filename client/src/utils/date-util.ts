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

const SINCE_YEAR = 1970;
/** Returns the number of months passed since 00:00:00 UTC on 1 January 1970 */
export const getNumberOfMonthsPassedFromTimestamp = (timestamp: number) => {
  const year = getYearFromTimestamp(timestamp);
  const month = getMonthFromTimestamp(timestamp);
  return (year - SINCE_YEAR) * 12 + month;
};

export const getMonthlyTimestampFromNumberOfMonth = (nMonths: number) => {
  const year = Math.floor(nMonths / 12) + SINCE_YEAR;
  const month = (12 + (nMonths % 12)) % 12;
  return getTimestampMillis(year, month);
};
