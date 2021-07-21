
// FIXME: timestamps are currently in seconds, but will eventually be provided in milliseconds
export const getYearFromTimestamp = (timestamp: number) => {
  return new Date(timestamp * 1000).getUTCFullYear();
};

export const getMonthFromTimestamp = (timestamp: number) => {
  return new Date(timestamp * 1000).getUTCMonth();
};

/** Returns a unix timestamp in seconds */
export const getTimestamp = (year: number, month: number) => {
  return new Date(Date.UTC(year, month)).getTime() / 1000;
};
