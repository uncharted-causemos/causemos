import * as d3 from 'd3';
import { showSvgTooltip, hideSvgTooltip, translate } from '@/utils/svg-util';
import { Timeseries, TimeseriesPoint } from '@/types/Timeseries';
import { D3Selection, D3GElementSelection } from '@/types/D3';

const X_AXIS_HEIGHT = 10;
const Y_AXIS_WIDTH = 20;
const PADDING_TOP = 10;
const PADDING_RIGHT = 20;

const X_AXIS_TICK_COUNT = 8;
const Y_AXIS_TICK_COUNT = 4;
const X_AXIS_TICK_SIZE_PX = 2;

const DEFAULT_LINE_COLOR = '#000';

export default function(
  selection: D3Selection,
  timeseriesList: Timeseries[],
  width: number,
  height: number
) {
  const groupElement = selection.append('g');
  const [xExtent, yExtent] = calculateExtents(timeseriesList);
  if (xExtent[0] === undefined || yExtent[0] === undefined) {
    console.error('Unable to derive extent from data', timeseriesList);
    return;
  }
  const [xScale, yScale] = calculateScales(width, height, xExtent, yExtent);
  renderAxes(groupElement, xScale, yScale, width, height);
  timeseriesList.forEach(timeSeries => {
    renderLine(groupElement, timeSeries, xScale, yScale);
  });
}

function calculateExtents(timeseriesList: Timeseries[]) {
  const allPoints = timeseriesList.map(timeSeries => timeSeries.points).flat();
  const xExtent = d3.extent(allPoints.map(point => point.timestamp));
  const yExtent = d3.extent(allPoints.map(point => point.value));
  return [xExtent, yExtent];
}

function calculateScales(
  width: number,
  height: number,
  xExtent: [number, number],
  yExtent: [number, number]
) {
  const xScale = d3
    .scaleLinear()
    .domain(xExtent)
    .range([Y_AXIS_WIDTH, width - PADDING_RIGHT]);
  const yScale = d3
    .scaleLinear()
    .domain(yExtent)
    .range([height - X_AXIS_HEIGHT - PADDING_TOP, PADDING_TOP]);
  return [xScale, yScale];
}

function renderLine(
  parentGroupElement: D3GElementSelection,
  timeseries: Timeseries,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
) {
  const line = d3
    .line<TimeseriesPoint>()
    .x(d => xScale(d.timestamp))
    .y(d => yScale(d.value));
  const yRange = yScale.range();
  const groupElement = parentGroupElement.append('g');
  groupElement
    .append('path')
    .classed('segment-line', true)
    // Draw a line connecting all points in this segment
    .attr('d', () => line(timeseries.points))
    .style('fill', 'none')
    .style('stroke', timeseries.color || DEFAULT_LINE_COLOR);
  // TODO: draw a rectangle for each timestamp, not for each point
  const rectangleWidth = 10;
  timeseries.points.forEach(point => {
    // Draw the rectangle that will be shown on hover
    groupElement
      .append('rect')
      .attr('x', xScale(point.timestamp) - 0.5 * rectangleWidth)
      .attr('y', yRange[1])
      .attr('width', rectangleWidth)
      .attr('height', yRange[0])
      .attr('fill', '#389')
      // Hide the rectangle initially
      .attr('fill-opacity', 0.0)
      .on('mouseenter', function() {
        d3.select(this).attr('fill-opacity', 0.2);
        showSvgTooltip(
          parentGroupElement,
          point.value.toFixed(2),
          [xScale(point.timestamp), yScale(point.value)],
          undefined,
          true
        );
      })
      .on('mouseleave', function() {
        d3.select(this).attr('fill-opacity', 0.0);
        hideSvgTooltip(parentGroupElement);
      });
  });
}

function renderAxes(
  selection: D3GElementSelection,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  width: number,
  height: number
) {
  const xAxis = d3
    .axisBottom(xScale)
    .tickSize(X_AXIS_TICK_SIZE_PX)
    .tickFormat(d => d.toString())
    .ticks(X_AXIS_TICK_COUNT);
  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(width - Y_AXIS_WIDTH - PADDING_RIGHT)
    .tickFormat(d => d.toString())
    .ticks(Y_AXIS_TICK_COUNT);
  selection
    .append('g')
    .classed('xAxis', true)
    .style('pointer-events', 'none')
    .call(xAxis)
    .style('font-size', '10px')
    .attr('transform', translate(0, height - X_AXIS_HEIGHT - PADDING_TOP));
  selection
    .append('g')
    .classed('yAxis', true)
    .style('pointer-events', 'none')
    .call(yAxis)
    .style('font-size', '10px')
    .attr('transform', translate(width - PADDING_RIGHT, 0));
}
