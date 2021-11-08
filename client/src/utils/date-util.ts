export const getYearFromTimestamp = (timestamp: number) => {
  return new Date(timestamp).getUTCFullYear();
};

export const getMonthFromTimestamp = (timestamp: number) => {
  return new Date(timestamp).getUTCMonth();
};

export const getTimestampAfterMonths = (timestamp: number, monthsElapsed: number) => {
  const month = getMonthFromTimestamp(timestamp);
  const year = getYearFromTimestamp(timestamp);
  const newMonth = (month + monthsElapsed) % 12;
  const yearsToAdd = ((month + monthsElapsed) - newMonth) / 12;
  const newYear = year + yearsToAdd;
  return getTimestampMillis(newYear, newMonth);
};

export const roundToNearestMonth = (timestamp: number) => {
  const year = getYearFromTimestamp(timestamp);
  const thisMonthIndex = getMonthFromTimestamp(timestamp);
  const nextMonthIndex = (thisMonthIndex + 1) % 12;
  const thisMonthTimestamp = Date.UTC(
    year,
    thisMonthIndex
  );
  const nextMonthTimestamp = Date.UTC(
    nextMonthIndex === 0 ? year + 1 : year,
    nextMonthIndex
  );
  if (timestamp - thisMonthTimestamp > nextMonthTimestamp - timestamp) {
    // Closer to next month then the first date of this month
    return nextMonthTimestamp;
  }
  // Closer to the first date of this month
  return thisMonthTimestamp;
};

/** Returns a unix timestamp in milliseconds */
export const getTimestampMillis = (year: number, month: number) => {
  return new Date(Date.UTC(year, month)).getTime();
};
