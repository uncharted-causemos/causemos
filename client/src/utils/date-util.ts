
// FIXME: timestamps are currently in milliseconds, but will eventually be provided in seconds
export const getYearFromTimestamp = (timestamp: number) => {
  return new Date(timestamp * 1000).getUTCFullYear();
};

export const getMonthFromTimestamp = (timestamp: number) => {
  return new Date(timestamp * 1000).getMonth();
};
