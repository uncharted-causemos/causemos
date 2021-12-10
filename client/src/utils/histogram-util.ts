import { ProjectionConstraint } from '@/types/CAG';
import { TimeScale } from '@/types/Enums';
import {
  TimeseriesDistributionPoint,
  TimeseriesPoint
} from '@/types/Timeseries';
import _ from 'lodash';
import { getMonthFromTimestamp, getTimestampAfterMonths } from './date-util';
import { getSliceMonthsFromTimeScale } from './time-scale-util';

export type BinCounts = [number, number, number, number, number];
export type BinBoundaries = [number, number, number, number];
export type HistogramData = {
  binCounts: BinCounts;
  binBoundaries: BinBoundaries;
};
export type ProjectionHistograms = [
  HistogramData,
  HistogramData,
  HistogramData
];

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
export const findPartitionValue = (
  values: number[],
  fractionInLowerBin: number
) => {
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
 *
 *  Note that this method has the potential to throw out, e.g. 3/4 of the data.
 *  The benefit is that it produces much better results for data with annual
 *  (or sub-annual) seasonality. The downside is that it produces slightly
 *  weaker (or much weaker depending on data scarcity) results for data without
 *  annual seasonality. In the future we should consider making this toggleable
 *  or dependent on the node's existing seasonality property.
 *
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

const isAbstractNode = (historicalData: TimeseriesPoint[]) => {
  return historicalData.length === 0;
};

export const computeProjectionBins = (
  historicalData: TimeseriesPoint[],
  monthsElapsedSinceNow: number,
  projectionStartMonth: number
): [number, number, number, number] => {
  if (isAbstractNode(historicalData)) {
    // There is no historical data, so return arbitrary
    //  buckets between 0 and 1
    return ABSTRACT_NODE_BINS;
  }
  // Use the last historical value as the value for "now"
  const nowValue = historicalData[historicalData.length - 1].value;
  const differences = extractRelevantHistoricalChanges(
    historicalData,
    monthsElapsedSinceNow,
    projectionStartMonth
  );
  // Split differences into positive and negative
  const negative_values = differences.filter(change => change < 0);
  const positive_values = differences.filter(change => change > 0);
  // Distribute 0s evenly between negative/positive halves
  differences
    .filter(change => change === 0)
    .forEach((zero, index) => {
      if (index % 2 === 0) {
        negative_values.push(zero);
      } else {
        positive_values.push(zero);
      }
    });

  // Choose bin sizes for the positive values such that
  //  - the "negligible change" bin contains roughly 7.96% of positive values
  //    (In a normal distribution, ~7.96% of values are within 0.1 standard
  //    deviations of the mean)
  //  - the "higher" bin contains roughly 46.02% of positive values
  //  - the "much higher" bin contains the remaining roughly 46.02%
  const fractionInNegligibleBin = 0.0796;

  let negligibleNegativeCutoff = findPartitionValue(
    negative_values,
    1 - fractionInNegligibleBin
  );
  const nonNegligibleNegative = negative_values.filter(
    value => value < negligibleNegativeCutoff
  );
  let lowerMuchLowerCutoff = findPartitionValue(nonNegligibleNegative, 0.5);

  let negligiblePositiveCutoff = findPartitionValue(
    positive_values,
    fractionInNegligibleBin
  );
  const nonNegligiblePositive = positive_values.filter(
    value => value > negligiblePositiveCutoff
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

export const convertTimeseriesDistributionToHistograms = (
  timeScale: TimeScale,
  historicalData: TimeseriesPoint[],
  projection: TimeseriesDistributionPoint[]
): ProjectionHistograms => {
  // 1. Use selected timescale to get relevant month offsets from TIME_SCALE_OPTIONS constant
  // This represents how many months from "now" each displayed time slice will be
  const relevantMonthOffsets = getSliceMonthsFromTimeScale(timeScale);
  const projectionStartTimestamp = projection[0].timestamp;
  const projectionStartMonth = getMonthFromTimestamp(projectionStartTimestamp);
  // For each timeslice:
  return relevantMonthOffsets.map(monthIndex => {
    // 2. Get bins from historical data using computeProjectionBins()
    const bins = computeProjectionBins(
      historicalData,
      monthIndex,
      projectionStartMonth
    );
    const monthTimestamp = getTimestampAfterMonths(
      projectionStartTimestamp,
      monthIndex
    );
    // 3. Find distribution that's nearest to this timestep
    let closestDistribution: number[] | null = null;
    let closestTimestamp: number | null = null;
    projection.forEach(({ values, timestamp }) => {
      if (
        closestTimestamp === null ||
        Math.abs(timestamp - monthTimestamp) <
          Math.abs(closestTimestamp - monthTimestamp)
      ) {
        closestTimestamp = timestamp;
        closestDistribution = values;
      }
    });
    if (closestDistribution === null) {
      console.error(
        'Unable to convert projection to histogram, projection array is likely empty:',
        projection
      );
      closestDistribution = [];
    }
    // 4. Feed distribution into bins to get histogram
    const histogram: HistogramData = {
      binBoundaries: bins,
      binCounts: [0, 0, 0, 0, 0]
    };
    closestDistribution.forEach(value => {
      histogram.binCounts = addValueToHistogram(value, histogram);
    });
    return histogram;
  }) as [HistogramData, HistogramData, HistogramData];
};

/**
 * Finds the correct bin that a value should be mapped to and increments it by one.
 * @param value the number to be assigned to a bin.
 * @param histogram 4 bin boundaries and their 5 current counts.
 * @returns the updated bin counts.
 */
const addValueToHistogram = (value: number, histogram: HistogramData) => {
  const { binBoundaries, binCounts } = histogram;
  const updatedBinCounts = _.clone(binCounts);
  if (value < binBoundaries[0]) {
    // Much lower
    updatedBinCounts[4]++;
  } else if (value < binBoundaries[1]) {
    // Lower
    updatedBinCounts[3]++;
  } else if (value < binBoundaries[2]) {
    // Negligible change
    updatedBinCounts[2]++;
  } else if (value < binBoundaries[3]) {
    // Higher
    updatedBinCounts[1]++;
  } else {
    // Much higher
    updatedBinCounts[0]++;
  }
  return updatedBinCounts;
};

/**
 * Maps constraints to histograms to summarize them more succinctly.
 * Each constraint in the period between time slices is mapped to the following time slice's histogram.
 * @param timeScale used to determine which time periods to group constraints into.
 * @param historicalData used to determine whether a clamp represents a normal change or extreme change.
 * @param projectionStartTimestamp used with historical data to differentiate between normal/extreme changes.
 * @param constraints a list of steps and values to be summarized.
 * @returns 3 lists of 5 integers. Each list represents a time period, each number represents how many clamps fell into that bin.
 */
export const summarizeConstraints = (
  timeScale: TimeScale,
  historicalData: TimeseriesPoint[],
  projectionStartTimestamp: number,
  constraints: ProjectionConstraint[]
) => {
  const result = _.range(3).map(() => ({
    binCounts: [0, 0, 0, 0, 0],
    binBoundaries: [0, 0, 0, 0]
  })) as ProjectionHistograms;
  // 1. Use selected timescale to get relevant month offsets from TIME_SCALE_OPTIONS constant
  // This will be used to determine which histogram the clamp should be mapped to
  const timeSliceMonths = getSliceMonthsFromTimeScale(timeScale);
  const projectionStartMonth = getMonthFromTimestamp(projectionStartTimestamp);
  // For each constraint:
  constraints.forEach(constraint => {
    // 2. Get bins from historical data using computeProjectionBins()
    const bins = computeProjectionBins(
      historicalData,
      constraint.step,
      projectionStartMonth
    );
    // 3. Find which timeSlice it falls into
    let timeSliceIndex = -1;
    if (constraint.step < timeSliceMonths[0]) {
      //  Anything before the first time slice will be mapped to the first time slice
      timeSliceIndex = 0;
    } else if (constraint.step < timeSliceMonths[1]) {
      //  Anything between the first two time slices will be mapped to the second
      timeSliceIndex = 1;
    } else {
      //  Anything else will be mapped to the third
      timeSliceIndex = 2;
    }
    // 4. Select histogram for this time slice and increment the relevant bin
    const histogram: HistogramData = result[timeSliceIndex];
    histogram.binBoundaries = bins;
    result[timeSliceIndex].binCounts = addValueToHistogram(
      constraint.value,
      histogram
    );
  });
  return result;
};

/**
 * A histogram can show up to 2 arrows when "relative to" is active:
 *  - No arrows are shown when there's no change.
 *  - 1 arrow is shown if the change can be summarized as shifting higher or
 *    lower. `arrow2` is null in this case.
 *  - 2 arrows are shown if the change can be summarized as more or less
 *    precise.
 * The from/to properties of each arrow refer to the bin indices that the arrow
 *  starts/ends in, respectively.
 * `messagePosition` refers to the index of the bin that the summary message
 * should appear beside.
 */
interface RelativeChangeSummary {
  arrow1: null | { from: number; to: number };
  messagePosition: number;
  arrow2: null | { from: number; to: number };
}

/**
 * An algorithm to produce a summary of the relative difference between two histograms.
 * It follows these steps:
 *  1. find the bins with the greatest loss and greatest gain.
 *  2. discard the other bins.
 *  3. find the average index of the bins with the greatest loss (and same for greatest gain)
 *  4. if these average indices are the same, there's no higher/lower shift.
 *      The change can be summarized as more/less precise and we'll use two arrows to show this.
 *  5. else, the magnitude and direction of change can be summarized by the difference between the average indices.
 *      We use one arrow from the farthest bin with the greatest loss to the bin with the greatest gain.
 *
 * One gotcha is that it's unclear where the message should be positioned when there are multiple
 * bins with the greatest gain. In these cases we just put the message in the middle.
 *
 * In practice it is unlikely that there will frequently be multiple bins tied for greatest loss/gain.
 *
 * @param changes one number for each of the 5 bins. Negative numbers represent a relative decrease in that bin.
 * @returns an object containing enough information to generate a one-sentence summary of the change, as well as the arrows used to support the sentence.See RelativeChangeSummary for more detail.
 */
export const summarizeRelativeChange = (
  changes: [number, number, number, number, number]
): RelativeChangeSummary => {
  // ASSUMPTION: total losses should equal total gains in magnitude
  const greatestLoss = _.min(changes) ?? 0;
  const greatestGain = _.max(changes) ?? 0;
  if (greatestLoss === 0 || greatestGain === 0) {
    // No change
    return {
      arrow1: null,
      messagePosition: 2,
      arrow2: null
    };
  }
  const binsWithGreatestLoss: number[] = [];
  const binsWithGreatestGain: number[] = [];
  changes.forEach((change, binIndex) => {
    if (change === greatestLoss) {
      binsWithGreatestLoss.push(binIndex);
    } else if (change === greatestGain) {
      binsWithGreatestGain.push(binIndex);
    }
  });
  // Calculate the average bin index for the maxes, and the average
  //  bin index for the mins.
  const meanMaxValueBinIndex = _.mean(binsWithGreatestGain);
  const meanMinValueBinIndex = _.mean(binsWithGreatestLoss);
  // Calculate the difference between the averages to get the magnitude and
  //  direction of change
  const difference = Math.ceil(meanMaxValueBinIndex - meanMinValueBinIndex);
  // Determine which arrows and text to show depending on the
  //  number of bins that contain the min and max values
  if (difference !== 0) {
    const messagePosition = binsWithGreatestGain[0];
    return {
      arrow1: { from: messagePosition - difference, to: messagePosition },
      messagePosition,
      arrow2: null
    };
  }
  // No shift higher or lower, it's either more or less precise
  //  so we'll need to draw two arrows
  const isMorePrecise =
    (_.min(binsWithGreatestLoss) ?? 0) < (_.min(binsWithGreatestGain) ?? 0);
  // If there's only one max bin, show the message there.
  // Otherwise things get messy, so just put the message in the center
  const isMultipleMaxBins = binsWithGreatestGain.length !== 1;
  const messagePosition = isMultipleMaxBins ? 2 : binsWithGreatestGain[0];
  if (isMorePrecise) {
    return {
      arrow1: { from: messagePosition - 1, to: messagePosition },
      messagePosition,
      arrow2: { from: messagePosition + 1, to: messagePosition }
    };
  }
  return {
    arrow1: { from: messagePosition - 1, to: messagePosition - 2 },
    messagePosition,
    arrow2: { from: messagePosition + 1, to: messagePosition + 2 }
  };
};

const MAGNITUDE_ADJECTIVES = ['', 'small', '', 'large', 'extreme'];

/**
 * Generates the user-friendly string to be displayed at `summary.messagePosition`.
 *
 * Output will typically be of the form
 *
 * `{ before: 'Large shift toward', emphasized: 'higher', after: ' values.' }`
 *
 * @param summary null when 'relative to" mode is not active. See RelativeChangeSummary for more detail.
 * @returns an object containing three strings: an emphasized section as well as the text before and after that.
 */
export const generateRelativeSummaryMessage = (
  summary: RelativeChangeSummary | null
) => {
  if (summary === null) return { before: '', emphasized: '', after: '' };
  const { arrow1, messagePosition, arrow2 } = summary;
  if (arrow1 === null) {
    return { before: 'No change.', emphasized: '', after: '' };
  }
  if (arrow2 !== null) {
    // Either more or less certain
    const isMoreCertain = arrow2.to === messagePosition;
    const emphasized = (isMoreCertain ? 'More' : 'Less') + ' certain';
    return { before: '', emphasized, after: ' values.' };
  }
  const magnitudeOfChange = Math.abs(arrow1.to - arrow1.from);
  const magnitudeAdjective = MAGNITUDE_ADJECTIVES[magnitudeOfChange];
  const directionOfChange = arrow1.to < arrow1.from ? 'higher' : 'lower';
  return {
    before: _.capitalize(`${magnitudeAdjective} shift toward `.trim()),
    emphasized: directionOfChange,
    after: ' values.'
  };
};
