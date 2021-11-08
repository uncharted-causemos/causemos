import * as d3 from 'd3';
import moment from 'moment';
import { Timeseries, TimeseriesPoint } from '@/types/Timeseries';
import { D3GElementSelection } from '@/types/D3';
import { translate } from './svg-util';
import { calculateDiff } from '@/utils/value-util';


const DEFAULT_LINE_COLOR = '#000';
const DEFAULT_LINE_WIDTH = 2;


export function applyRelativeTo(
  timeseriesData: Timeseries[],
  relativeTo: string | null,
  showPercentChange = false
) {
  const baselineData = timeseriesData.find(
    timeseries => timeseries.id === relativeTo
  );
  if (
    relativeTo === null ||
    timeseriesData.length < 2 ||
    baselineData === undefined
  ) {
    return {
      baselineMetadata: null,
      timeseriesData
    };
  }
  // User wants to display data relative to one run
  const returnValue: Timeseries[] = [];
  timeseriesData.forEach(timeseries => {
    // Adjust values
    const { id, name, color, points, isDefaultRun } = timeseries;
    const adjustedPoints = points.map(({ timestamp, value }) => {
      const baselineValue =
        baselineData.points.find(point => point.timestamp === timestamp)
          ?.value ?? 0;
      return {
        timestamp,
        value: calculateDiff(baselineValue, value, showPercentChange)
      };
    });
    returnValue.push({
      id,
      isDefaultRun,
      name,
      color,
      points: adjustedPoints.filter(point => !Number.isNaN(point.value))
    });
  });
  const baselineMetadata = {
    name: baselineData.name,
    color: baselineData.color
  };
  return { baselineMetadata, timeseriesData: returnValue };
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
  xAxisTickCount = 4,
  xAxisTickSizePx = 2
) {
  const xAxis = d3
    .axisBottom(xScale)
    .tickSize(xAxisTickSizePx)
    .tickFormat(timestampFormatter)
    .ticks(xAxisTickCount);

  const yAxisTicks = calculateGenericTicks(
    yScale.domain()[0],
    yScale.domain()[1]
  );
  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(width - yAxisWidth - paddingRight)
    .tickFormat(valueFormatter)
    .tickValues(yAxisTicks);
  selection
    .append('g')
    .classed('xAxis', true)
    .style('pointer-events', 'none')
    .call(xAxis)
    .style('font-size', '10px')
    .attr('transform', translate(0, height - xAxisHeight));
  selection
    .append('g')
    .classed('yAxis', true)
    .style('pointer-events', 'none')
    .call(yAxis)
    .style('font-size', '10px')
    .attr('transform', translate(width - paddingRight, 0));
}

export function calculateYearlyTicks (
  firstTimestamp: number,
  lastTimestamp: number,
  width: number,
  minTickSpacing = 10,
  useMonthTicks = true
) {
  const firstYear = moment(firstTimestamp);
  const lastYear = moment(lastTimestamp);

  const majorIncrecmentsElapsed = lastYear.year() - firstYear.year();

  let tickIncrements = [];

  // create array of years from firstYear to lastYear
  // epoch seconds for jan first of each year
  if (majorIncrecmentsElapsed * 12 > width / minTickSpacing || !useMonthTicks) { // not enough space for minor ticks
    tickIncrements = Array.from({ length: majorIncrecmentsElapsed }, (v, k) => moment([k + 1 + firstYear.year()]).valueOf());
  } else { // enough space for minor ticks
    for (let i = 0; i < majorIncrecmentsElapsed * 12; i++) {
      const momentPlusDuration = moment(firstYear.add(1, 'month')); // add increment of minor duration to next tick
      const momentNormalized = moment([momentPlusDuration.year(), momentPlusDuration.month(), 1]); // force tick to first of month, FIXME - this is still hardcoded to only work with years and months, not quite sure how to fix
      tickIncrements.push(momentNormalized.valueOf());
    }
  }

  return tickIncrements;
}
export function calculateGenericTicks (
  min: number,
  max: number
) {
  const tickIncrements = [min];
  if (min < 0 && max > 0) { // if zero is in range, include it
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

  selection
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
  yAxisWidth: number
) {
  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(xOffset - yAxisWidth)
    .tickFormat(valueFormatter)
    .tickValues(yTickValues);

  selection
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
    .x(d => xScale(d.timestamp))
    .y(d => yScale(d.value));
  parentGroupElement
    .append('path')
    .classed('segment-line', true)
    .attr('d', () => line(points))
    .style('fill', 'none')
    .style('stroke', color || DEFAULT_LINE_COLOR)
    .style('stroke-width', width || DEFAULT_LINE_WIDTH);
}


export function renderPoint(
  parentGroupElement: D3GElementSelection,
  points: TimeseriesPoint[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  color?: string
) {
  const circles = parentGroupElement
    .selectAll('segment-line')
    .data(points);
  circles
    .enter()
    .append('circle')
    .classed('circle', true)
    .attr('r', 2.5)
    .attr('cx', d => xScale(d.timestamp))
    .attr('cy', d => yScale(d.value))
    .style('stroke', '#fff')
    .style('stroke-width', 1.5)
    .style('fill', color || DEFAULT_LINE_COLOR);
}
