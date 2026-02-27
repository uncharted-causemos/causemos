import _ from 'lodash';

const REMOVE_BELOW = 0.25;
const NO_CHANGE_ABOVE = 0.9;

/**
 * THIS IS A COPY OF incomplete-data-detection.ts in client
 */
export const correctIncompleteTimeseries = (
  timeseries: any[],
  rawResolution: string,
  temporalResolution: string,
  temporalAggregation: string,
  finalRawDate: Date
): any[] => {
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

  if (!validDates) {
    return sortedPoints;
  }

  const coverage = computeCoverage(finalRawDate, rawResolution, temporalResolution);
  if (coverage !== undefined && coverage >= 0 && coverage < REMOVE_BELOW) {
    sortedPoints.pop();
  } else if (coverage !== undefined && coverage < NO_CHANGE_ABOVE) {
    lastPoint.value *= 1 / coverage;
  }
  return sortedPoints;
};

const computeCoverage = (
  finalRawDate: Date,
  rawRes: string,
  aggRes: string
): number | undefined => {
  const lastMonth = finalRawDate.getUTCMonth();

  if (aggRes === 'year') {
    const lastMonthNum = lastMonth + 1;
    const lastDayOfYear = lastMonth * 30 + finalRawDate.getUTCDate();
    switch (rawRes) {
      case 'other':
      case 'annual':
        return 1;
      case 'monthly':
        return lastMonthNum / 12;
      case 'dekad':
        return lastDayOfYear / 10 / 36;
      case 'weekly':
        return lastDayOfYear / 7 / 52;
      case 'daily':
        return lastDayOfYear / 365;
    }
  } else {
    const lastDayOfMonth = finalRawDate.getUTCDate();
    switch (rawRes) {
      case 'other':
      case 'annual':
      case 'monthly':
        return 1;
      case 'dekad':
        return lastDayOfMonth / 10 / 3;
      case 'weekly':
        return lastDayOfMonth / 7 / 4;
      case 'daily':
        return lastDayOfMonth / 30;
    }
  }
  return undefined;
};
