export const getYearFromTimestamp = (timestamp: number) => {
  return new Date(timestamp).getUTCFullYear();
};

export const getMonthFromTimestamp = (timestamp: number) => {
  return new Date(timestamp).getUTCMonth();
};

/** Returns a unix timestamp in seconds */
export const getTimestamp = (year: number, month: number) => {
  return new Date(Date.UTC(year, month)).getTime() / 1000;
};
