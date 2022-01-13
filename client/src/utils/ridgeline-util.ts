import { TimeScale } from '@/types/Enums';
import { TimeseriesDistributionPoint } from '@/types/Timeseries';
import * as d3 from 'd3';
import { TIME_SCALE_OPTIONS_MAP } from './time-scale-util';

export interface RidgelinePoint {
  coordinate: number;
  value: number;
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
  binCount: number
) => {
  // Use selected timescale to get relevant month offsets from
  //  TIME_SCALE_OPTIONS constant. This represents how many months from "now"
  //  each displayed time slice will be.
  const timeSlices = TIME_SCALE_OPTIONS_MAP.get(timeScale)?.timeSlices ?? [];
  const ridgelines = timeSlices.map(timeSlice => {
    // Convert the month offset to a timestamp and extract the relevant
    //  distribution from the timeseries.
    // FIXME: is there a neater way to do this? monthOffsets are 1 indexed,
    //  projection values are 0 indexed
    const monthOffset = timeSlice.months - 1;
    const timestamp = timeseries[monthOffset].timestamp;
    const distribution = timeseries[monthOffset].values;
    // Convert the distribution to a ridgeline, and attach the timestamp and
    //  label for rendering later.
    return {
      timestamp,
      label: timeSlice.shortLabel,
      ridgeline: convertDistributionToRidgeline(
        distribution,
        min,
        max,
        binCount
      )
    };
  });
  return ridgelines;
};
