import {
  AggregationOption,
  IncompleteDataCorrectiveAction,
  TemporalResolution,
  TemporalResolutionOption,
} from '@/types/Enums';
import { Timeseries, TimeseriesPoint } from '@/types/Timeseries';
import _ from 'lodash';

const REMOVE_BELOW = 0.25;
const NO_CHANGE_ABOVE = 0.9;

const SUPERSCRIPTS = new Map([
  [IncompleteDataCorrectiveAction.DataRemoved, '*'],
  [IncompleteDataCorrectiveAction.DataExtrapolated, '\u2020'], // dagger
]);
const TOOLTIPS = new Map([
  [
    IncompleteDataCorrectiveAction.DataRemoved,
    '* There was insufficient data to produce an accurate aggregate value for the final timeframe.' +
      '<br>\u2002 The outlier point has been removed from the time series.',
  ],
  [
    IncompleteDataCorrectiveAction.DataExtrapolated,
    '\u2020 The final timeframe contained fewer data points than required to produce an accurate ' +
      'aggregate value.<br>\u2002 The final point in the time series has been scaled based on the ' +
      'number of data points.',
  ],
]);

/**
 * Checks the final point in each of the timeseries and adjusts
 * them based on information about the raw data.
 *
 * If the raw data covers less than {@see REMOVE_BELOW} of the last timeframe the last point is removed.
 * If the raw data covers more than {@see NO_CHANGE_ABOVE} of the last timeframe there is no change.
 * If the coverage falls between these values and the aggregation is set to 'Sum' the data is scaled
 * by the reciprocal of the coverage.
 *
 * @param {Timeseries[]} timeseriesData - A list of Timeseries objects each containing a list of points
 * @param {TemporalResolution} rawResolution - Resolution of the raw data
 * @param {TemporalResolutionOption} temporalResolution - Resolution of the aggregated data
 * @param {AggregationOption} temporalAggregation - Temporal aggregation function
 * @param {Date} finalRawDate - Final date from the raw data
 *
 * @returns {object} An updated list of Timeseries objects with the correctiveAction field set.
 */
export function correctIncompleteTimeseriesLists(
  timeseriesData: Timeseries[],
  rawResolution: TemporalResolution,
  temporalResolution: TemporalResolutionOption,
  temporalAggregation: AggregationOption,
  finalRawDate: Date
): Timeseries[] {
  return timeseriesData.map((timeseries: Timeseries) => {
    const { action, points } = correctIncompleteTimeseries(
      timeseries.points,
      rawResolution,
      temporalResolution,
      temporalAggregation,
      finalRawDate
    );
    return {
      ...timeseries,
      points,
      correctiveAction: action,
    };
  });
}

/**
 * Checks the final point in the timeseries and adjusts it based on information about the raw data.
 *
 * If the raw data covers less than {@see REMOVE_BELOW} of the last timeframe the last point is removed.
 * If the raw data covers more than {@see NO_CHANGE_ABOVE} of the last timeframe there is no change.
 * If the coverage falls between these values and the aggregation is set to 'Sum' the data is scaled
 * by the reciprocal of the coverage.
 *
 * @param {TimeseriesPoint[]} timeseries - List of points
 * @param {TemporalResolution} rawResolution - Resolution of the raw data
 * @param {TemporalResolutionOption} temporalResolution - Resolution of the aggregated data
 * @param {AggregationOption} temporalAggregation - Temporal aggregation function
 * @param {Date} finalRawDate - Final date from the raw data
 *
 * @returns {object} The adjusted list of points and the action that was performed.
 */
export function correctIncompleteTimeseries(
  timeseries: TimeseriesPoint[],
  rawResolution: TemporalResolution,
  temporalResolution: TemporalResolutionOption,
  temporalAggregation: AggregationOption,
  finalRawDate: Date
): { action: IncompleteDataCorrectiveAction; points: TimeseriesPoint[] } {
  const sortedPoints = _.cloneDeep(_.sortBy(timeseries, 'timestamp'));
  const lastPoint = _.last(sortedPoints);

  if (temporalAggregation !== AggregationOption.Sum) {
    return { action: IncompleteDataCorrectiveAction.NotRequired, points: sortedPoints };
  } else if (lastPoint === undefined || lastPoint.timestamp > finalRawDate.getTime()) {
    return { action: IncompleteDataCorrectiveAction.OutOfScopeData, points: sortedPoints };
  }

  const lastAggDate = new Date(lastPoint.timestamp);
  const areDatesValid =
    lastAggDate.getUTCFullYear() === finalRawDate.getUTCFullYear() &&
    (temporalResolution === TemporalResolutionOption.Year ||
      (temporalResolution === TemporalResolutionOption.Month &&
        lastAggDate.getUTCMonth() === finalRawDate.getUTCMonth()));

  // Check if we're looking at the correct month/year (in case the metadata was invalid)
  if (!areDatesValid) {
    return { action: IncompleteDataCorrectiveAction.OutOfScopeData, points: sortedPoints };
  }

  const coverage = computeCoverage(finalRawDate, rawResolution, temporalResolution);
  if (coverage < REMOVE_BELOW) {
    sortedPoints.pop();
    return { action: IncompleteDataCorrectiveAction.DataRemoved, points: sortedPoints };
  } else if (coverage < NO_CHANGE_ABOVE) {
    lastPoint.value *= 1 / coverage;
    return { action: IncompleteDataCorrectiveAction.DataExtrapolated, points: sortedPoints };
  } else {
    return { action: IncompleteDataCorrectiveAction.CompleteData, points: sortedPoints };
  }
}

/**
 * Compute the temporal coverage of the final aggregated data point using the final
 * raw data point and the temporal resolutions.
 *
 * The raw temporal resolution has to be finer than the aggregated resolution.
 * If the raw resolution is coarser or equal to the aggregated resolution, the coverage
 * is assumed to be 100%. The raw resolution 'Other' is assumed to always have 100% coverage.
 *
 * This function uses the following approximations and assumptions:
 * - All years have 12 months
 * - All years have 36 dekad
 * - All years have 52 weeks
 * - All years have 365 days
 * - All months have 3 dekad
 * - All months have 4 weeks
 * - All months have 30 days
 *
 * @param {Date} finalRawDate - Final date from the raw data
 * @param {TemporalResolution} rawRes - Resolution of the raw data
 * @param {TemporalResolutionOption} aggRes - Resolution of the aggregated data
 *
 * @returns {number} The percentage of the final month/year that was covered by the raw data.
 * Negative values indicate inconsistent raw data and aggregated data timestamps.
 * Since approximations are used, the value could be greater than 1.
 */
const computeCoverage = (
  finalRawDate: Date,
  rawRes: TemporalResolution,
  aggRes: TemporalResolutionOption
) => {
  const lastMonth = finalRawDate.getUTCMonth();

  if (aggRes === TemporalResolutionOption.Year) {
    const lastMonthNum = lastMonth + 1; // range 1-12
    const lastDayOfYear = lastMonth * 30 + finalRawDate.getUTCDate();
    switch (rawRes) {
      case TemporalResolution.Other:
      case TemporalResolution.Annual:
        return 1;
      case TemporalResolution.Monthly: // 12 months in a year
        return lastMonthNum / 12;
      case TemporalResolution.Dekad: // 36 dekad in a year
        return lastDayOfYear / 10 / 36;
      case TemporalResolution.Weekly: // 52 weeks in a year
        return lastDayOfYear / 7 / 52;
      case TemporalResolution.Daily: // 365 days in a year
        return lastDayOfYear / 365;
    }
  } else {
    const lastDayOfMonth = finalRawDate.getUTCDate();
    switch (rawRes) {
      case TemporalResolution.Other:
      case TemporalResolution.Annual:
      case TemporalResolution.Monthly:
        return 1;
      case TemporalResolution.Dekad: // 3 dekad in a month
        return lastDayOfMonth / 10 / 3;
      case TemporalResolution.Weekly: // 4 weeks in a month
        return lastDayOfMonth / 7 / 4;
      case TemporalResolution.Daily: // 30 days in a month
        return lastDayOfMonth / 30;
    }
  }
};

export const getActionSuperscript = (action?: IncompleteDataCorrectiveAction) => {
  return SUPERSCRIPTS.get(action ?? IncompleteDataCorrectiveAction.NotRequired);
};

export const getActionTooltip = (action?: IncompleteDataCorrectiveAction) => {
  return TOOLTIPS.get(action ?? IncompleteDataCorrectiveAction.NotRequired);
};

export const getFootnotes = (actionList: (IncompleteDataCorrectiveAction | undefined)[]) => {
  return _.uniq(actionList)
    .map((action: IncompleteDataCorrectiveAction | undefined) =>
      action === undefined || !SUPERSCRIPTS.has(action)
        ? undefined
        : `${SUPERSCRIPTS.get(action)}${action}`
    )
    .filter((a) => a !== undefined)
    .join('  ');
};

export const getFootnoteTooltip = (actionList: (IncompleteDataCorrectiveAction | undefined)[]) => {
  return _.uniq(actionList)
    .map((action: IncompleteDataCorrectiveAction | undefined) =>
      action === undefined || !TOOLTIPS.has(action) ? undefined : TOOLTIPS.get(action)
    )
    .filter((a) => a !== undefined)
    .join('<br><br>');
};
