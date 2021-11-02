import { TimeseriesPoint } from '@/types/Timeseries';
import { getMonthFromTimestamp, getTimestampAfterMonths } from './date-util';

// The bin boundaries that are used when a node has no historical data.
export const ABSTRACT_NODE_BINS: [number, number, number, number] = [
  0.1,
  0.4,
  0.6,
  0.9
];

/**
 * Partitions a list of numbers into two parts and returns the value that's
 * between the two bins.
 * @param values any list of sorted or unsorted numbers with length > 0.
 * @param fractionInLowerBin a value in the range [0, 1) that determines how many values fall into each of the partitions.
 * @returns a number that is higher than `fractionInLowerBin` of the values in `values`, and lower than the rest.
 */
// Inspired by pandas' qcut function
// https://github.com/pandas-dev/pandas/blob/v1.3.4/pandas/core/reshape/tile.py#L302-L382
// https://github.com/pandas-dev/pandas/blob/v1.3.4/pandas/core/algorithms.py#L1116
export const findPartitionValue = (values: number[], fractionInLowerBin: number) => {
  if (values.length === 0) {
    return NaN;
  }
  // Clone array and sort values
  const sorted = [...values].sort((a, b) => a - b);
  // Find the index of the value that should be used as the divider
  const indexBetweenBins = fractionInLowerBin * (sorted.length - 1);
  const remainingFraction = indexBetweenBins % 1;
  if (remainingFraction === 0) {
    // The divider lines up perfectly with an entry in the array
    return sorted[indexBetweenBins];
  }
  // Return a value
  const floored = Math.floor(indexBetweenBins);
  const highestBelowDivider = sorted[floored];
  const lowestAboveDivider = sorted[floored + 1];
  const gapBetween = lowestAboveDivider - highestBelowDivider;
  return highestBelowDivider + gapBetween * remainingFraction;
};

/**
 *  Find historical intervals that start in `intervalStartMonth` and have a
 *  length of `intervalLengthInMonths`. E.g. if `intervalStartMonth` is April
 *  (month index of 3), and `intervalLengthInMonths` is 8, find all historical
 *  intervals from April to the following December. Then calculate the
 *  difference in value between the start and end of each interval.
 * @param historicalData the array of timeseries points to search.
 * @param intervalLengthInMonths the length of interval to look for.
 * @param intervalStartMonth an integer from 0(Jan) to 11(Dec).
 * @returns an array of numbers. A negative number indicates a decrease over the interval.
 */
export const extractRelevantHistoricalChanges = (
  historicalData: TimeseriesPoint[],
  intervalLengthInMonths: number,
  intervalStartMonth: number
) => {
  const changes: number[] = [];
  historicalData.forEach(point => {
    if (getMonthFromTimestamp(point.timestamp) === intervalStartMonth) {
      const timestampAfterInterval = getTimestampAfterMonths(
        point.timestamp,
        intervalLengthInMonths
      );
      const pointAfterInterval = historicalData.find(
        ({ timestamp }) => timestamp === timestampAfterInterval
      );
      if (pointAfterInterval !== undefined) {
        changes.push(pointAfterInterval.value - point.value);
      }
    }
  });
  return changes;
};

export const computeProjectionBins = (
  historicalData: TimeseriesPoint[],
  t0ClampValue: number | null,
  monthsElapsedSinceT0: number,
  projectionStartMonth: number
): [number, number, number, number] => {
  if (historicalData.length === 0) {
    // Abstract node: There is no historical data, so return arbitrary
    //  buckets between 0 and 1
    return ABSTRACT_NODE_BINS;
  }
  // If there's a clamp at t0, use that as the "now" value,
  //  otherwise use the last historical value
  const nowValue =
    t0ClampValue ?? historicalData[historicalData.length - 1].value;
  const differences = extractRelevantHistoricalChanges(
    historicalData,
    monthsElapsedSinceT0,
    projectionStartMonth
  );
  // Split differences into positive and negative
  // Intervals with no change are discarded. It would be nice to somehow take
  //  these into account to reduce bin size, however this will almost never
  //  make a difference in practice. Adding this extra logic is probably not
  //  worth the added algorithm complexity.
  const negative_values = differences.filter(change => change < 0);
  const positive_values = differences.filter(change => change > 0);

  // Choose bin sizes for the positive values such that
  //  - the "negligible change" bin contains roughly 7.96% of positive values
  //    (In a normal distribution, ~7.96% of values are within 0.1 standard
  //    deviations of the mean)
  //  - the "higher" bin contains roughly 46.02% of positive values
  //  - the "much higher" bin contains the remaining roughly 46.02%
  const fractionInNegligibleBin = 0.0796;

  let negligibleNegativeCutoff = findPartitionValue(
    negative_values,
    fractionInNegligibleBin
  );
  const nonNegligibleNegative = negative_values.filter(
    value => value < negligibleNegativeCutoff
  );
  let lowerMuchLowerCutoff = findPartitionValue(nonNegligibleNegative, 0.5);

  let negligiblePositiveCutoff = findPartitionValue(
    positive_values,
    1 - fractionInNegligibleBin
  );
  const nonNegligiblePositive = positive_values.filter(
    value => value <= negligiblePositiveCutoff
  );
  let higherMuchHigherCutoff = findPartitionValue(nonNegligiblePositive, 0.5);

  const lowerBinsAreInvalid =
    Number.isNaN(lowerMuchLowerCutoff) ||
    Number.isNaN(negligibleNegativeCutoff);
  const higherBinsAreInvalid =
    Number.isNaN(negligiblePositiveCutoff) ||
    Number.isNaN(higherMuchHigherCutoff);

  if (lowerBinsAreInvalid && higherBinsAreInvalid) {
    // There may be a more user-friendly way to handle the case where there
    //  aren't enough data to split into 3 positive and 3 negative bins. e.g.
    //  - Should we return something like `null` to signal to the UI that this
    //    case is distinct from the abstract node case?
    //  - Is there a fallback heuristic we can use to compute better bins?
    //  - If so, is it worth the added algorithm complexity?
    return ABSTRACT_NODE_BINS.map(binBoundary => binBoundary + nowValue) as [
      number,
      number,
      number,
      number
    ];
  } else if (lowerBinsAreInvalid) {
    // Invert and copy positive cutoffs
    negligibleNegativeCutoff = -negligiblePositiveCutoff;
    lowerMuchLowerCutoff = -higherMuchHigherCutoff;
  } else if (higherBinsAreInvalid) {
    // Invert and copy negative cutoffs
    negligiblePositiveCutoff = -negligibleNegativeCutoff;
    higherMuchHigherCutoff = -lowerMuchLowerCutoff;
  }

  const bins: [number, number, number, number] = [
    nowValue + lowerMuchLowerCutoff,
    nowValue + negligibleNegativeCutoff,
    nowValue + negligiblePositiveCutoff,
    nowValue + higherMuchHigherCutoff
  ];

  return bins;
};
