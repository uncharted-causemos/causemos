import { TimeScale } from '@/types/Enums';
import {
  TimeseriesDistributionPoint,
  TimeseriesPoint
} from '@/types/Timeseries';
import * as d3 from 'd3';
import _ from 'lodash';
import { getTimestampAfterMonths } from './date-util';
import {
  getMonthsPerTimestepFromTimeScale,
  getTimeScaleOption
} from './time-scale-util';

// When creating a curve to estimate the density of the distribution, we group
//  points into bins (necessary to convert the one-dimensional data into 2D).
// Raise the bin count to make the curve less smooth.
const RIDGELINE_BIN_COUNT = 20;

export interface RidgelinePoint {
  coordinate: number;
  value: number;
}

export interface RidgelineWithMetadata {
  label: string;
  timestamp: number;
  monthsAfterNow: number;
  ridgeline: RidgelinePoint[];
  distributionMean: number;
}

const convertDistributionToRidgeline = (
  distribution: number[],
  min: number,
  max: number,
  binCount: number
) => {
  // Convert distribution to a histogram with `binCount` bins
  const binWidth = (max - min) / binCount;
  // Add a threshold at min, one at max, and `binCount - 1` others evenly
  //  spaced between them
  const thresholds = [
    ...Array.from({ length: binCount }, (d, i) => min + i * binWidth)
  ];
  const bins = d3.bin().domain([min, max]).thresholds(thresholds);
  const histogram = bins(distribution).map(bin => {
    const lower = bin.x0 ?? 0;
    const upper = bin.x1 ?? 1;
    const count = bin.length;
    return {
      midpoint: lower + (upper - lower) / 2,
      normalizedCount: count / distribution.length
    };
  });
  // Convert to a line with a point at the middle of each bin
  // Add point to min and max of range so that line continues to edge of range
  //  instead of stopping at the midpoint of the last bin.
  // Add a second point at each end with value 0 so that when the path is
  //  closed it always has a flat bottom, rather than cutting diagonally
  //  through the rest of the plot and causing visual artifacts
  const line: RidgelinePoint[] = [
    { coordinate: min, value: 0 },
    { coordinate: min, value: histogram[0].normalizedCount },
    ...histogram.map(bin => ({
      coordinate: bin.midpoint,
      value: bin.normalizedCount
    })),
    { coordinate: max, value: histogram[histogram.length - 1].normalizedCount },
    { coordinate: max, value: 0 }
  ];
  return line;
};

/**
 * Describe the shapes of a timeseries' relevant distributions
 * @param timeseries a series of distributions, each with a timestamp
 * @param timeScale used to determine which distributions are "relevant"
 * @param min the minimum possible value that can occur in a distribution
 * @param max the maximum possible value that can occur in a distribution
 * @param binCount the lower this is, the smoother the resulting ridgeline
 * @returns a ridgeline for each relevant timeslice to describe its distribution
 */
export const convertDistributionTimeseriesToRidgelines = (
  timeseries: TimeseriesDistributionPoint[],
  timeScale: TimeScale,
  min: number,
  max: number,
  onlyConvertTimeslices = true,
  binCount = RIDGELINE_BIN_COUNT
) => {
  // Use selected timescale to get relevant month counts from the
  //  TIME_SCALE_OPTIONS constant. This is used to provide labels and determine
  //  which distributions will be converted to ridgelines if
  //  `onlyConvertTimeslices` is true.
  const timeSlices = getTimeScaleOption(timeScale).timeSlices;

  const getTimeSliceAtStepIndex = (timestepIndex: number) => {
    // Find the timeslice whose (one-indexed) month count matches (0-indexed)
    //  timestepIndex.
    const monthsPerTimestep = getMonthsPerTimestepFromTimeScale(timeScale);
    const monthsAfterNow = (timestepIndex + 1) * monthsPerTimestep;
    return timeSlices.find(timeSlice => timeSlice.months === monthsAfterNow);
  };

  const ridgelines: RidgelineWithMetadata[] = [];

  timeseries.forEach(({ values }, timestepIndex) => {
    const timeSliceAtThisTimestep = getTimeSliceAtStepIndex(timestepIndex);
    if (onlyConvertTimeslices && timeSliceAtThisTimestep === undefined) return;
    // Convert the distribution to a ridgeline, and attach more information for
    //  rendering later.
    const monthsPerTimestep = getMonthsPerTimestepFromTimeScale(timeScale);
    const monthsAfterNow = (timestepIndex + 1) * monthsPerTimestep;
    // When `timestamp` is returned as a part of the projections, its value
    //  seems to be slightly offset from the actual month (especially
    //  noticeable after February), so override it with the correct timestamp.
    const correctedTimestamp = getTimestampAfterMonths(
      timeseries[0].timestamp,
      monthsAfterNow
    );
    ridgelines.push({
      timestamp: correctedTimestamp,
      label: timeSliceAtThisTimestep?.shortLabel ?? '',
      monthsAfterNow,
      distributionMean: _.mean(values),
      ridgeline: convertDistributionToRidgeline(values, min, max, binCount)
    });
  });

  return ridgelines;
};

export const calculateTypicalChangeBracket = (
  historicalData: TimeseriesPoint[],
  intervalLengthInMonths: number,
  projectionStart: number
) => {
  if (historicalData.length === 0) return null;
  const changes: number[] = [];
  const historicalDataMap = new Map<number, number>();
  // As an optimization, convert historical data into a map for faster lookup
  //  within the next loop
  historicalData.forEach(({ timestamp, value }) => {
    historicalDataMap.set(timestamp, value);
  });
  historicalData.forEach(({ timestamp, value }) => {
    const pointAfterInterval = historicalDataMap.get(
      getTimestampAfterMonths(timestamp, intervalLengthInMonths)
    );
    if (pointAfterInterval !== undefined) {
      changes.push(pointAfterInterval - value);
    }
  });
  const min = _.min(changes);
  const max = _.max(changes);
  if (min === undefined || max === undefined) {
    // No pair of points was found with the correct interval length
    return null;
  }
  const dataBeforeProjectionStart = historicalData.filter(
    point => point.timestamp < projectionStart
  );
  const latestHistoricalValue = _.last(dataBeforeProjectionStart)?.value ?? 0;
  return { min: latestHistoricalValue + min, max: latestHistoricalValue + max };
};

export const summarizeRidgelineComparison = (
  scenario: RidgelineWithMetadata,
  comparisonBaseline: RidgelineWithMetadata,
  min: number,
  max: number
) => {
  const fivePercentOfRange = (max - min) / 20;
  const meanDifference =
    scenario.distributionMean - comparisonBaseline.distributionMean;
  if (Math.abs(meanDifference) < fivePercentOfRange) {
    // TODO: use standard deviation to test whether scenario is more/less
    //  certain when means are approximately equal
    return {
      before: 'No significant change.',
      emphasized: '',
      after: ''
    };
  }
  let magnitudeAdjective = '';
  const twentyFivePercentOfRange = fivePercentOfRange * 5;
  const fiftyPercentOfRange = fivePercentOfRange * 10;
  if (Math.abs(meanDifference) < twentyFivePercentOfRange) {
    magnitudeAdjective = 'small';
  } else if (Math.abs(meanDifference) < fiftyPercentOfRange) {
    magnitudeAdjective = 'large';
  } else {
    magnitudeAdjective = 'extreme';
  }
  const direction =
    scenario.distributionMean > comparisonBaseline.distributionMean
      ? 'higher'
      : 'lower';
  return {
    before: _.capitalize(`${magnitudeAdjective} shift toward `),
    emphasized: direction,
    after: ' values.'
  };
};
