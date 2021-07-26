import * as d3 from 'd3';
import { Timeseries, TimeseriesPoint } from '@/types/Timeseries';
import { D3GElementSelection } from '@/types/D3';
import { translate } from './svg-util';

const DEFAULT_LINE_COLOR = '#000';

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
  xAxisTickCount = 4,
  yAxisTickCount = 2,
  xAxisTickSizePx = 2
) {
  const xAxis = d3
    .axisBottom(xScale)
    .tickSize(xAxisTickSizePx)
    .tickFormat(timestampFormatter)
    .ticks(xAxisTickCount);
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
  color?: string
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
    .style('stroke', color || DEFAULT_LINE_COLOR);
}
