import _ from 'lodash';

/* Time-series Utility functions */

/**
 * Get timestamps from an array of timeseries
 *
 * @param {string} arrayOfTimeseries - array of time series
 * @param {number} key - sometimes timeseries can be included in an array of objects and we need to specify the key where we should be able to find them within that object
 */
export const getTimestamps = (arrayOfTimeseries, key = '') => {
  const timeseries = _.flatten(arrayOfTimeseries.map(d => key === '' ? d : d[key]));
  const timestamps = timeseries.map(t => t.timestamp);
  return timestamps;
};

export const getTimeRange = (arrayOfTimestamps) => {
  const start = _.min(arrayOfTimestamps);
  const end = _.max(arrayOfTimestamps);
  return [start, end];
};

export default {
  getTimestamps,
  getTimeRange
};
