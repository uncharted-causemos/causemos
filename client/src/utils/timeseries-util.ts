import * as d3 from 'd3';
import _ from 'lodash';
import moment from 'moment';
import { ProjectionTimeseries, Timeseries, TimeseriesPoint } from '@/types/Timeseries';
import { D3GElementSelection } from '@/types/D3';
import { translate } from './svg-util';
import {
  TemporalAggregationLevel,
  ReferenceSeriesOption,
  TemporalResolutionOption,
} from '@/types/Enums';
import { getMonthFromTimestamp, getYearFromTimestamp } from '@/utils/date-util';
import { calculateDiff } from '@/utils/value-util';
import { colorFromIndex } from './colors-util';

const DEFAULT_LINE_COLOR = '#000';
const DEFAULT_LINE_WIDTH = 2;
const DEFAULT_POINT_RADIUS = 2.5;
const DEFAULT_SQUARE_SIDE_LENGTH = 4;

export function applyReference(
  timeseriesData: Timeseries[],
  rawTimeseriesData: Timeseries[],
  breakdownOption: string | null,
  referenceOptions: string[]
) {
  let referenceTimeseries = [] as Timeseries[];
  let colorOffset = timeseriesData.length;

  if (breakdownOption === TemporalAggregationLevel.Year) {
    if (referenceOptions.includes(ReferenceSeriesOption.AllYears)) {
      const brokenDownByYear = breakdownByYear(rawTimeseriesData[0].points);
      const allYearsFormattedTimeseries = Object.keys(brokenDownByYear).map((year) => {
        const points = brokenDownByYear[year];
        const mappedToBreakdownDomain = convertTimestampsToMonthIndex(points);
        return {
          name: year,
          id: year,
          points: mappedToBreakdownDomain,
        } as Timeseries;
      });

      const aggregratedRefSeries = aggregateRefTemporalTimeseries(allYearsFormattedTimeseries);
      const existingReferenceTimeseries = referenceTimeseries.find(
        (rts) => rts.id === ReferenceSeriesOption.AllYears
      );

      if (existingReferenceTimeseries) {
        existingReferenceTimeseries.points = aggregratedRefSeries.points;
      } else {
        aggregratedRefSeries.id = ReferenceSeriesOption.AllYears;
        aggregratedRefSeries.isDefaultRun = false;
        aggregratedRefSeries.name = 'All Years';
        aggregratedRefSeries.color = colorFromIndex(colorOffset);
        referenceTimeseries.push(aggregratedRefSeries);
        colorOffset++;
      }
    }

    if (referenceOptions.includes(ReferenceSeriesOption.SelectYears) && timeseriesData.length > 0) {
      const aggregratedRefSeries = aggregateRefTemporalTimeseries(timeseriesData);
      const existingreferenceTimeseries = referenceTimeseries.find(
        (rts) => rts.id === ReferenceSeriesOption.SelectYears
      );

      if (existingreferenceTimeseries) {
        existingreferenceTimeseries.points = aggregratedRefSeries.points;
      } else {
        aggregratedRefSeries.id = ReferenceSeriesOption.SelectYears;
        aggregratedRefSeries.isDefaultRun = false;
        aggregratedRefSeries.name = 'Select Years';
        aggregratedRefSeries.color = colorFromIndex(colorOffset);
        referenceTimeseries.push(aggregratedRefSeries);
      }
    }
    referenceTimeseries = referenceTimeseries.filter((rts) => referenceOptions.includes(rts.id));
  }

  return timeseriesData.concat(referenceTimeseries);
}

export function applyRelativeTo(
  timeseriesData: Timeseries[],
  relativeTo: string | null,
  showPercentChange = false
) {
  const baselineData = timeseriesData.find((timeseries) => timeseries.id === relativeTo);
  if (relativeTo === null || timeseriesData.length < 2 || baselineData === undefined) {
    return {
      baselineMetadata: null,
      timeseriesData,
    };
  }
  // User wants to display data relative to one run
  const returnValue: Timeseries[] = [];
  timeseriesData.forEach((timeseries) => {
    // Adjust values
    const { id, name, color, points, isDefaultRun, correctiveAction } = timeseries;
    const adjustedPoints = points.map(({ timestamp, value }) => {
      const baselineValue =
        baselineData.points.find((point) => point.timestamp === timestamp)?.value ?? 0;
      return {
        timestamp,
        value: calculateDiff(baselineValue, value, showPercentChange),
      };
    });
    returnValue.push({
      id,
      isDefaultRun,
      name,
      color,
      points: adjustedPoints.filter((point) => !Number.isNaN(point.value)),
      correctiveAction,
    });
  });
  const baselineMetadata = {
    name: baselineData.name,
    color: baselineData.color,
  };
  return { baselineMetadata, timeseriesData: returnValue };
}

export function breakdownByYear(timeseries: TimeseriesPoint[]) {
  return _.groupBy(timeseries, (point) => getYearFromTimestamp(point.timestamp));
}

export function convertTimestampsToMonthIndex(points: TimeseriesPoint[]) {
  return points.map(({ value, timestamp }) => ({
    value,
    timestamp: getMonthFromTimestamp(timestamp),
  }));
}

const aggregateRefTemporalTimeseries = (temporalTimeseries: Timeseries[]): Timeseries => {
  // because we can have data with missing months, we need to count up instances of each month
  // across however many years on are in the time series
  const monthCounts = temporalTimeseries.reduce(
    (acc: TimeseriesPoint[], year: Timeseries): TimeseriesPoint[] => {
      year.points.forEach((p) => {
        const month = acc.find((mc) => mc.timestamp === p.timestamp);
        if (month) {
          month.value++;
        } else {
          acc.push({
            timestamp: p.timestamp,
            value: 1,
          });
        }
      });
      return acc;
    },
    new Array<TimeseriesPoint>()
  );

  const aggregratedRefSeries = temporalTimeseries.reduce(
    (acc: Timeseries, ts: Timeseries, ind: number) => {
      if (ind === 0) {
        acc.points = monthCounts.map((p) => {
          return {
            timestamp: p.timestamp,
            value: 0,
          } as TimeseriesPoint;
        });
      }
      ts.points.forEach((p) => {
        const accMonth = acc.points.find((ap) => ap.timestamp === p.timestamp);
        accMonth && (accMonth.value = accMonth.value + p.value);
      });
      return acc;
    },
    {} as Timeseries
  );

  aggregratedRefSeries.points.forEach((p) => {
    const month = monthCounts.find((mc) => mc.timestamp === p.timestamp);
    if (month) {
      p.value = p.value / month.value;
    }
  });
  aggregratedRefSeries.points.sort((a, b) => {
    return a.timestamp - b.timestamp;
  });
  return aggregratedRefSeries;
};

export function xAxis(
  xScale: d3.ScaleLinear<number, number>,
  timestampFormatter: (timestamp: any) => string,
  temporalResolution: TemporalResolutionOption,
  width: number
) {
  // generate uniformly-spaced and nicely-rounded tick values between start and end (inclusive)
  const firstDate = moment.utc(xScale.domain()[0]);
  const lastDate = moment.utc(xScale.domain()[1]);
  const pixelsForEachTick = temporalResolution === TemporalResolutionOption.Year ? 60 : 120;
  const tickCount = Math.round(width / pixelsForEachTick) ?? 1;
  const xTickValues = d3.timeTicks(firstDate.toDate(), lastDate.toDate(), tickCount);
  // Ensure that ticks count does not repeat
  //  (which can happen if the number of ticks larger than the number of data points)
  // NOTE that this is more of a hack to avoid examining the actual data points
  //  and consider their count against the tick count
  const xTickValuesFormatted = _.uniq(xTickValues.map((date) => timestampFormatter(date)));
  const axis = d3
    .axisBottom(xScale)
    .tickValues(xTickValuesFormatted.map((dateStr) => Date.parse(dateStr)))
    .tickFormat(timestampFormatter);
  return axis;
}

export function renderAxes(
  selection: D3GElementSelection,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  // The type of value can't be more specific than `any`
  //  because under the hood d3.tickFormat requires d3.NumberType.
  // It correctly converts, but its TypeScript definitions don't
  //  seem to reflect that.
  valueFormatter: (value: any) => string,
  width: number,
  height: number,
  timestampFormatter: (timestamp: any) => string,
  yAxisWidth: number,
  paddingRight: number,
  xAxisHeight: number,
  temporalResolution: TemporalResolutionOption
) {
  const xAxisCreated = xAxis(xScale, timestampFormatter, temporalResolution, width);
  const yAxisTicks = calculateGenericTicks(yScale.domain()[0], yScale.domain()[1]);
  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(width - yAxisWidth - paddingRight)
    .tickFormat(valueFormatter)
    .tickValues(yAxisTicks);
  const xAxisSelection = selection
    .append('g')
    .classed('xAxis', true)
    .style('pointer-events', 'none')
    .call(xAxisCreated)
    .style('font-size', '10px')
    .attr('transform', translate(0, height - xAxisHeight));
  const yAxisSelection = selection
    .append('g')
    .classed('yAxis', true)
    .style('pointer-events', 'none')
    .call(yAxis)
    .style('font-size', '10px')
    .attr('transform', translate(width - paddingRight, 0));
  return [xAxisSelection, yAxisSelection];
}

export function calculateYearlyTicks(
  firstTimestamp: number,
  lastTimestamp: number,
  width: number,
  minTickSpacing = 45
) {
  const firstYear = moment.utc(firstTimestamp);
  const lastYear = moment.utc(lastTimestamp);

  const majorIncrecmentsElapsed = lastYear.year() - firstYear.year();

  const tickIncrements = [];

  const yearGap = majorIncrecmentsElapsed / (width / minTickSpacing);
  const threshold = 0.7; // Seems to be be nice from experimentation

  // create array of tick values by year or by month, based on how space is available
  if (yearGap > threshold) {
    // Not enough space for minor ticks
    for (let i = 0; i < majorIncrecmentsElapsed; i += Math.ceil(yearGap)) {
      // Epoch seconds for jan first of each year
      tickIncrements.push(moment.utc([i + firstYear.year()]).valueOf());
    }
  } else {
    // Enough space for minor ticks
    for (let year = 0; year <= majorIncrecmentsElapsed; year++) {
      for (let month = 0; month < 12; month++) {
        tickIncrements.push(moment.utc([year + firstYear.year(), month]).valueOf());
      }
    }
  }
  return tickIncrements;
}

export function calculateGenericTicks(min: number, max: number) {
  const tickIncrements = [min];
  if (min < 0 && max > 0) {
    // if zero is in range, include it
    tickIncrements.push(0);
  }
  tickIncrements.push(max);
  return tickIncrements;
}
export function renderXaxis(
  selection: D3GElementSelection,
  xScale: d3.ScaleLinear<number, number>,
  xTickValues: Array<number>,
  yOffset: number,
  timestampFormatter: (timestamp: any) => string,
  xAxisTickSizePx = 2
) {
  // only calls formatter in january, otherwise returns empty string for now label
  const customTimestampFormatter = function (v: any) {
    if (v === undefined || v === null) {
      return '';
    }
    const input = moment.utc(v);
    if (input.month() === 0) {
      return timestampFormatter(v);
    }
    return '';
  };

  const xAxis = d3
    .axisBottom(xScale)
    .tickSize(xAxisTickSizePx)
    .tickFormat(customTimestampFormatter)
    .tickValues(xTickValues);

  return selection
    .append('g')
    .classed('xAxis', true)
    .style('pointer-events', 'none')
    .call(xAxis)
    .style('font-size', '10px')
    .attr('transform', translate(0, yOffset));
}

export function renderYaxis(
  selection: D3GElementSelection,
  yScale: d3.ScaleLinear<number, number>,
  yTickValues: Array<number>,
  // The type of value can't be more specific than `any`
  //  because under the hood d3.tickFormat requires d3.NumberType.
  // It correctly converts, but its TypeScript definitions don't
  //  seem to reflect that.
  valueFormatter: (value: any) => string,
  xOffset: number,
  yAxisWidth: number,
  showDataOutsideNorm: boolean
) {
  // yTick values should only be min and max.  Ensure we don't have a visual occlusion with normal line ticks by ensuring minimum distance
  if (showDataOutsideNorm) {
    if (Math.min(...yTickValues) < -0.1) {
      yTickValues = [...yTickValues, 0];
    }
    if (Math.max(...yTickValues) > 1.1) {
      yTickValues = [...yTickValues, 1];
    }
  }

  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(xOffset - yAxisWidth)
    .tickFormat(valueFormatter)
    .tickValues(yTickValues);

  return selection
    .append('g')
    .classed('yAxis', true)
    .style('pointer-events', 'none')
    .call(yAxis)
    .style('font-size', '10px')
    .attr('transform', translate(xOffset, 0));
}

export function renderLine(
  parentGroupElement: D3GElementSelection,
  points: TimeseriesPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  color?: string,
  width?: number
) {
  // Draw a line connecting all points in this segment
  const line = d3
    .line<TimeseriesPoint>()
    .x((d) => xScale(d.timestamp))
    .y((d) => yScale(d.value));
  const lineSelection = parentGroupElement
    .append('path')
    .classed('segment-line', true)
    .attr('d', () => line(points))
    .style('fill', 'none')
    .style('stroke', color || DEFAULT_LINE_COLOR)
    .style('stroke-width', width || DEFAULT_LINE_WIDTH);
  return lineSelection;
}

export function renderXAxisLine(
  parentGroupElement: D3GElementSelection,
  startx: number,
  endx: number,
  y: number,
  dashLength: number,
  dashGap: number,
  color?: string,
  width?: number
) {
  const lineSelection = parentGroupElement
    .append('path')
    .classed('normal-limit-line', true)
    .attr('d', `M${startx},${y}L${endx},${y}`)
    .attr('stroke-dasharray', `${dashLength},${dashGap}`)
    .style('fill', 'none')
    .style('stroke', color || DEFAULT_LINE_COLOR)
    .style('stroke-width', width || DEFAULT_LINE_WIDTH);
  return lineSelection;
}

export function renderDashedLine(
  parentGroupElement: D3GElementSelection,
  points: TimeseriesPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  dashLength: number,
  dashGap: number,
  color?: string,
  width?: number
) {
  const lineSelection = renderLine(parentGroupElement, points, xScale, yScale, color, width);
  lineSelection.attr('stroke-dasharray', `${dashLength},${dashGap}`);
  return lineSelection;
}

/**
 * NOTE: Overwrites the existing points in the parentGroupElement.
 * @param parentGroupElement Element in which to create the points
 * @param points The points to render
 * @param xScale The x scale to use
 * @param yScale The y scale to use
 * @param color Defaults to DEFAULT_LINE_COLOR
 * @param radius The radius of the points
 */
export function renderPoint(
  parentGroupElement: D3GElementSelection,
  points: TimeseriesPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  color?: string,
  radius = DEFAULT_POINT_RADIUS
) {
  const circles = parentGroupElement.selectAll('.circle').data(points);
  circles
    .enter()
    .append('circle')
    .classed('circle', true)
    .attr('r', radius)
    .attr('cx', (d) => xScale(d.timestamp))
    .attr('cy', (d) => yScale(d.value))
    .style('stroke', '#fff')
    .style('stroke-width', 1.5)
    .style('fill', color || DEFAULT_LINE_COLOR);
}

/**
 * NOTE: Overwrites the existing squares in the parentGroupElement.
 * @param parentGroupElement Element in which to create the squares
 * @param points The points at which to render the squares
 * @param xScale The x scale to use
 * @param yScale The y scale to use
 * @param color Defaults to DEFAULT_LINE_COLOR
 * @param sideLength The side length of the squares
 */
export function renderSquares(
  parentGroupElement: D3GElementSelection,
  points: TimeseriesPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  color?: string,
  sideLength = DEFAULT_SQUARE_SIDE_LENGTH
) {
  const squares = parentGroupElement.selectAll('.square').data(points);
  squares
    .enter()
    .append('rect')
    .classed('square', true)
    .attr('width', sideLength)
    .attr('height', sideLength)
    .attr('x', (d) => xScale(d.timestamp) - sideLength / 2)
    .attr('y', (d) => yScale(d.value) - sideLength / 2)
    .style('stroke', color || DEFAULT_LINE_COLOR)
    .style('stroke-width', 1.5)
    .style('fill', '#fff');
}

export function normalizeTimeseriesList(timeseriesList: Timeseries[]) {
  const allTimestampsPoints = timeseriesList.map((timeseries) => timeseries.points).flat();
  const allTimestampsValues = allTimestampsPoints.map((point) => point.value);
  const minValue = _.min(allTimestampsValues) as number;
  const maxValue = _.max(allTimestampsValues) as number;
  if (minValue === maxValue) {
    // minValue === maxValue, so vertically align its value in the center
    allTimestampsPoints.forEach((p) => {
      p.normalizedValue = 0.5;
    });
  } else {
    allTimestampsPoints.forEach((p) => {
      p.normalizedValue = (p.value - minValue) / (maxValue - minValue);
    });
  }
}

export function invertTimeseriesList(timeseriesList: ProjectionTimeseries[]) {
  const allTimestampsPoints = timeseriesList.map((timeseries) => timeseries.points).flat();
  const maxValue = 1; // assume data is normalized between 0 and 1

  allTimestampsPoints.forEach((p) => {
    p.value = maxValue - p.value;
  });

  return timeseriesList;
}

export const timeseriesExtrema = (timeseriesList: ProjectionTimeseries[]) => {
  let globalMaxY = 0;
  let globalMinY = 0;

  timeseriesList.forEach((series) => {
    const values = series.points.map((point) => point.value);

    const localMin = Math.min(...values);
    if (localMin < globalMinY) {
      globalMinY = localMin;
    }

    const localMax = Math.max(...values);
    if (localMax > globalMaxY) {
      globalMaxY = localMax;
    }
  });

  return {
    globalMaxY,
    globalMinY,
  };
};

export const MAX_TIMESERIES_LABEL_CHAR_LENGTH = 10;

const _getMinMaxTimestamp = (timeseriesData: Timeseries[], fn: 'max' | 'min') => {
  const allTimestamps = timeseriesData
    .map((timeseries) => timeseries.points)
    .flat()
    .map((point) => point.timestamp);
  const lastTimestamp = _[fn](allTimestamps) ?? null;
  return lastTimestamp;
};
export const getMaxTimestamp = (timeseriesData: Timeseries[]) =>
  _getMinMaxTimestamp(timeseriesData, 'max');
export const getMinTimestamp = (timeseriesData: Timeseries[]) =>
  _getMinMaxTimestamp(timeseriesData, 'min');
export const getTimestampRange = (timeseriesData: Timeseries[]) => ({
  start: getMinTimestamp(timeseriesData),
  end: getMaxTimestamp(timeseriesData),
});
