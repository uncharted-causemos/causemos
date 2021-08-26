import * as d3 from 'd3';
import moment from 'moment';
import { Timeseries, TimeseriesPoint } from '@/types/Timeseries';
import { D3GElementSelection } from '@/types/D3';
import { translate } from './svg-util';


const DEFAULT_LINE_COLOR = '#000';
const DEFAULT_LINE_WIDTH = 2;


export function applyRelativeTo(
  timeseriesData: Timeseries[],
  relativeTo: string | null
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
    const { id, name, color, points } = timeseries;
    const adjustedPoints = points.map(({ timestamp, value }) => {
      const baselineValue =
        baselineData.points.find(point => point.timestamp === timestamp)
          ?.value ?? 0;
      return {
        timestamp,
        value: value - baselineValue
      };
    });
    returnValue.push({
      id,
      name,
      color,
      points: adjustedPoints
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
  yAxisTickCount = 2,
  xAxisTickSizePx = 2,
  xAxisMajorTickIncrement: moment.unitOfTime.DurationConstructor = 'year',
  xAxisMinorTickIncrement: moment.unitOfTime.DurationConstructor = 'month',
  useMinorTicks = true
) {
  const firstTimestamp = xScale.domain()[0];
  const lastTimestamp = xScale.domain()[1];

  const firstYear = moment(firstTimestamp);
  const lastYear = moment(lastTimestamp);
  const majorIncrecmentsElapsed = lastYear.get(xAxisMajorTickIncrement) - firstYear.get(xAxisMajorTickIncrement);
  const minTickSpacing = 10;

  const major = moment.duration(1, xAxisMajorTickIncrement).as('ms');
  const minor = moment.duration(1, xAxisMinorTickIncrement).as('ms');
  const minorInMajor = Math.trunc(major / minor);

  console.log(minorInMajor);

  let tickIncrements = [];

  if (majorIncrecmentsElapsed * minorInMajor > width / minTickSpacing || !useMinorTicks) {
    // create array of years from firstYear to lastYear
    // epoch seconds for jan first of each year
    tickIncrements = Array.from({ length: majorIncrecmentsElapsed }, (v, k) => moment([k + 1 + firstYear.year()]).valueOf());
  } else {
    for (let i = 0; i < majorIncrecmentsElapsed * minorInMajor; i++) {
      const tempMoment = moment(firstYear.add(1, xAxisMinorTickIncrement));
      const temp2Moment = moment([tempMoment.year(), tempMoment.month(), 1]);
      tickIncrements.push(temp2Moment.valueOf());
    }
  }

  const customTimestampFormatter = function (v: any) {
    if (v === undefined || v === null) {
      return '';
    }
    const input = moment.utc(v);
    if (input.get(xAxisMinorTickIncrement) === 0) {
      return timestampFormatter(v);
    }
    return '';
  };

  const xAxis = d3
    .axisBottom(xScale)
    .tickSize(xAxisTickSizePx)
    .tickFormat(customTimestampFormatter)
    .tickValues(tickIncrements);
  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(width - yAxisWidth - paddingRight)
    .tickFormat(valueFormatter)
    .ticks(yAxisTickCount);
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
