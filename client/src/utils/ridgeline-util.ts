import { TimeScale } from '@/types/Enums';
import { TimeseriesDistributionPoint } from '@/types/Timeseries';
import * as d3 from 'd3';
import { getTimeScaleOption } from './time-scale-util';

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
  ridgeline: RidgelinePoint[];
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
  const bins = d3
    .bin()
    .domain([min, max])
    .thresholds(thresholds);
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
    return timeSlices.find(timeSlice => timeSlice.months === timestepIndex + 1);
  };

  const ridgelines: RidgelineWithMetadata[] = [];

  timeseries.forEach(({ timestamp, values }, timestepIndex) => {
    const timeSliceAtThisTimestep = getTimeSliceAtStepIndex(timestepIndex);
    if (onlyConvertTimeslices && timeSliceAtThisTimestep === undefined) return;
    // Convert the distribution to a ridgeline, and attach the timestamp and
    //  label for rendering later.
    ridgelines.push({
      timestamp,
      label: timeSliceAtThisTimestep?.shortLabel ?? '',
      ridgeline: convertDistributionToRidgeline(values, min, max, binCount)
    });
  });

  return ridgelines;
};
