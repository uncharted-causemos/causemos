import {
  AggregationOption,
  IncompleteDataCorrectiveAction,
  TemporalResolution,
  TemporalResolutionOption
} from '@/types/Enums';
import { Timeseries, TimeseriesPoint } from '@/types/Timeseries';
import _ from 'lodash';

const REMOVE_BELOW = 0.25;
const NO_CHANGE_ABOVE = 0.9;

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
 * @param {Date} periodEndDate - Final date from the raw data
 *
 * @returns {object} An updated list of Timeseries objects with the correctiveAction field set.
 */
export function correctIncompleteTimeseries(
  timeseriesData: Timeseries[],
  rawResolution: TemporalResolution,
  temporalResolution: TemporalResolutionOption,
  temporalAggregation: AggregationOption,
  periodEndDate: Date
): Timeseries[] {
  return timeseriesData.map((timeseries: Timeseries) => {
    const { action, points } = correctIncompleteData(timeseries.points, rawResolution,
      temporalResolution, temporalAggregation, periodEndDate);
    return {
      ...timeseries,
      points,
      correctiveAction: action
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
 * @param {Date} periodEndDate - Final date from the raw data
 *
 * @returns {object} The adjusted list of points and the action that was performed.
 */
export function correctIncompleteData(
  timeseries: TimeseriesPoint[],
  rawResolution: TemporalResolution,
  temporalResolution: TemporalResolutionOption,
  temporalAggregation: AggregationOption,
  periodEndDate: Date
): { action: IncompleteDataCorrectiveAction, points: TimeseriesPoint[] } {
  const sortedPoints = _.cloneDeep(_.sortBy(timeseries, 'timestamp'));
  const lastPoint = _.last(sortedPoints);

  if (temporalAggregation !== AggregationOption.Sum) {
    return { action: IncompleteDataCorrectiveAction.NotRequired, points: sortedPoints };
  } else if (lastPoint === undefined || lastPoint.timestamp > periodEndDate.getTime()) {
    return { action: IncompleteDataCorrectiveAction.OutOfScopeData, points: sortedPoints };
  }

  const lastPointDate = new Date(lastPoint.timestamp);
  const coverage = computeCoverage(lastPointDate, periodEndDate, rawResolution, temporalResolution);
  if (coverage < 0) {
    return { action: IncompleteDataCorrectiveAction.OutOfScopeData, points: sortedPoints };
  } else if (coverage < REMOVE_BELOW) {
    sortedPoints.pop();
    return { action: IncompleteDataCorrectiveAction.DataRemoved, points: sortedPoints };
  } else if (coverage < NO_CHANGE_ABOVE) {
    lastPoint.value *= (1 / coverage);
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
 * @param {Date} lastPointDate - model id
 * @param {Date} finalRawDate - resource
 * @param {TemporalResolution} rawRes - components
 * @param {TemporalResolutionOption} aggRes - components
 *
 * @returns {number} The percentage of the final month/year that was covered by the raw data.
 * Negative values indicate inconsistent raw data and aggregated data timestamps.
 * Since approximations are used, the value could be greater than 1.
 */
const computeCoverage = (lastPointDate: Date, finalRawDate: Date,
  rawRes: TemporalResolution, aggRes: TemporalResolutionOption) => {
  const lastMonth = lastPointDate.getUTCMonth();

  // Check if we're looking at the correct month/year (in case the metadata was invalid)
  if (lastPointDate.getUTCFullYear() === finalRawDate.getUTCFullYear() &&
    (aggRes === TemporalResolutionOption.Year ||
      (aggRes === TemporalResolutionOption.Month && lastMonth === finalRawDate.getUTCMonth()))
  ) {
    // Calculate coverage
    if (aggRes === TemporalResolutionOption.Year) {
      const lastMonthNum = lastMonth + 1; // range 1-12
      const lastDayOfYear = (lastMonth * 30) + lastPointDate.getUTCDate();
      switch (rawRes) {
        case TemporalResolution.Other:
        case TemporalResolution.Annual:
          return 1;
        case TemporalResolution.Monthly: // 12 months in a year
          return lastMonthNum / 12;
        case TemporalResolution.Dekad: // 36 dekad in a year
          return (lastDayOfYear / 10) / 36;
        case TemporalResolution.Weekly: // 52 weeks in a year
          return (lastDayOfYear / 7) / 52;
        case TemporalResolution.Daily: // 365 days in a year
          return lastDayOfYear / 365;
      }
    } else {
      const lastDayOfMonth = lastPointDate.getUTCDate();
      switch (rawRes) {
        case TemporalResolution.Other:
        case TemporalResolution.Annual:
        case TemporalResolution.Monthly:
          return 1;
        case TemporalResolution.Dekad: // 3 dekad in a month
          return (lastDayOfMonth / 10) / 3;
        case TemporalResolution.Weekly: // 4 weeks in a month
          return (lastDayOfMonth / 7) / 4;
        case TemporalResolution.Daily: // 30 days in a month
          return lastDayOfMonth / 30;
      }
    }
  } else {
    return -1;
  }
};
