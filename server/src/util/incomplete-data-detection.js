const _ = require('lodash');

const REMOVE_BELOW = 0.25;
const NO_CHANGE_ABOVE = 0.9;

/**
 * THIS IS A COPY OF incomplete-data-detection.ts in client
 */
const correctIncompleteTimeseries = (
  timeseries,
  rawResolution,
  temporalResolution,
  temporalAggregation,
  finalRawDate
) => {
  const sortedPoints = _.cloneDeep(_.sortBy(timeseries, 'timestamp'));
  const lastPoint = _.last(sortedPoints);

  if (temporalAggregation !== 'sum') {
    return sortedPoints;
  } else if (lastPoint === undefined || lastPoint.timestamp > finalRawDate.getTime()) {
    return sortedPoints;
  }

  const lastAggDate = new Date(lastPoint.timestamp);
  const validDates =
    lastAggDate.getUTCFullYear() === finalRawDate.getUTCFullYear() &&
    (temporalResolution === 'year' ||
      (temporalResolution === 'month' && lastAggDate.getUTCMonth() === finalRawDate.getUTCMonth()));

  // Check if we're looking at the correct month/year (in case the metadata was invalid)
  if (!validDates) {
    return sortedPoints;
  }

  const coverage = computeCoverage(finalRawDate, rawResolution, temporalResolution);
  if (coverage >= 0 && coverage < REMOVE_BELOW) {
    sortedPoints.pop();
  } else if (coverage < NO_CHANGE_ABOVE) {
    lastPoint.value *= 1 / coverage;
  }
  return sortedPoints;
};

const computeCoverage = (finalRawDate, rawRes, aggRes) => {
  const lastMonth = finalRawDate.getUTCMonth();

  if (aggRes === 'year') {
    const lastMonthNum = lastMonth + 1; // range 1-12
    const lastDayOfYear = lastMonth * 30 + finalRawDate.getUTCDate();
    switch (rawRes) {
      case 'other':
      case 'annual':
        return 1;
      case 'monthly': // 12 months in a year
        return lastMonthNum / 12;
      case 'dekad': // 36 dekad in a year
        return lastDayOfYear / 10 / 36;
      case 'weekly': // 52 weeks in a year
        return lastDayOfYear / 7 / 52;
      case 'daily': // 365 days in a year
        return lastDayOfYear / 365;
    }
  } else {
    const lastDayOfMonth = finalRawDate.getUTCDate();
    switch (rawRes) {
      case 'other':
      case 'annual':
      case 'monthly':
        return 1;
      case 'dekad': // 3 dekad in a month
        return lastDayOfMonth / 10 / 3;
      case 'weekly': // 4 weeks in a month
        return lastDayOfMonth / 7 / 4;
      case 'daily': // 30 days in a month
        return lastDayOfMonth / 30;
    }
  }
};

module.exports = {
  correctIncompleteTimeseries,
};
