import _ from 'lodash';
import * as d3 from 'd3';
import dateFormatter from '@/formatters/date-formatter';
import { D3GElementSelection, D3Selection } from '@/types/D3';
import { TimeseriesPointProjected } from '@/types/Timeseries';
import {
  calculateYearlyTicks,
  renderDashedLine,
  renderLine,
  renderPoint,
  renderXaxis,
} from '@/utils/timeseries-util';
import { translate } from '@/utils/svg-util';
import { ProjectionPointType } from '@/types/Enums';
import { splitProjectionsIntoLineSegments } from '@/utils/projection-util';

const HISTORICAL_RANGE_OPACITY = 0.05;
const SCROLL_BAR_HEIGHT = 20;
const SCROLL_BAR_RANGE_FILL = '#ccc';
const SCROLL_BAR_RANGE_STROKE = 'none';
const SCROLL_BAR_RANGE_OPACITY = 0.8;
const SCROLL_BAR_BACKGROUND_COLOR = '#888';
const SCROLL_BAR_BACKGROUND_OPACITY = HISTORICAL_RANGE_OPACITY;
const SCROLL_BAR_TIMESERIES_OPACITY = 0.2;

const X_AXIS_HEIGHT = 20;
const PADDING_TOP = 10;
const PADDING_LEFT = 10;
const PADDING_RIGHT = 10;

const DASHED_LINE = {
  length: 4,
  gap: 4,
  width: 1,
};
const SOLID_LINE_WIDTH = 1;
const WEIGHTED_SUM_LINE_OPACITY = 0.25;
const POINT_RADIUS = 3;

const DATE_FORMATTER = (value: any) => dateFormatter(value, 'MMM YYYY');

const renderTimeseries = (
  timeseries: TimeseriesPointProjected[],
  parentGroupElement: D3GElementSelection,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  isWeightedSum: boolean,
  color = 'black'
) => {
  // Render a circle at any point where all inputs have historical data
  const fullDataPoints = timeseries.filter(
    (point) => point.projectionType === ProjectionPointType.Historical
  );
  renderPoint(parentGroupElement, fullDataPoints, xScale, yScale, color, POINT_RADIUS);
  if (isWeightedSum) {
    // Render a lighter line across the whole series
    const lineSelection = renderLine(
      parentGroupElement,
      timeseries,
      xScale,
      yScale,
      color,
      SOLID_LINE_WIDTH
    );
    lineSelection.attr('opacity', WEIGHTED_SUM_LINE_OPACITY);
    return;
  }
  // This node has a dataset attached, so split the timeseries into solid and dashed segments
  const segments = splitProjectionsIntoLineSegments(timeseries);
  segments.forEach(({ isProjectedData, segment }) => {
    if (isProjectedData) {
      renderDashedLine(
        parentGroupElement,
        segment,
        xScale,
        yScale,
        DASHED_LINE.length,
        DASHED_LINE.gap,
        color,
        DASHED_LINE.width
      );
    } else {
      renderLine(parentGroupElement, segment, xScale, yScale, color, SOLID_LINE_WIDTH);
    }
  });
};

const renderBrushHandles = (g: D3GElementSelection, handlePositions: [number, number]) => {
  g.selectAll('.custom-handle')
    .data(handlePositions)
    .join((enter) => {
      const handleWidth = 9;
      const handleWidthGap = -2;
      const handleHGap = 0;
      const handleH = SCROLL_BAR_HEIGHT - 2 * handleHGap;
      const container = enter
        .append('g')
        .attr('class', 'custom-handle')
        .attr('cursor', 'ew-resize')
        .attr('pointer-events', 'none');
      container
        .append('rect')
        .attr('fill', '#f8f8f8')
        .attr('stroke', '#888888')
        .attr('y', handleHGap)
        .attr('x', (d, i) => (i === 0 ? -(handleWidth + handleWidthGap) : handleWidthGap))
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('width', handleWidth)
        .attr('height', handleH);
      // Vertical dots
      [0.3, 0.5, 0.7].forEach((value) => {
        container
          .append('circle')
          .attr('cx', (d, i) =>
            i === 0 ? -(0.5 * handleWidth + handleWidthGap) : 0.5 * handleWidth + handleWidthGap
          )
          .attr('cy', handleHGap + handleH * value)
          .attr('r', 1.25)
          .attr('fill', '#888888');
      });
      return container;
    })
    .attr('transform', (d) => translate(d, 0));
};

const renderScrollBarLabels = (
  scrollBarGroupElement: D3GElementSelection,
  scrollBarWidth: number,
  projectionStartTimestamp: number,
  projectionEndTimestamp: number
) => {
  const scrollbarLabelYOffset = 10;
  const scrollbarLabelXOffset = 5;
  scrollBarGroupElement.select('.scrollbar-range-start').remove();
  scrollBarGroupElement.select('.scrollbar-range-end').remove();
  scrollBarGroupElement
    .append('text')
    .classed('scrollbar-range-start', true)
    .attr('x', PADDING_LEFT + scrollbarLabelXOffset)
    .attr('y', scrollbarLabelYOffset)
    .style('text-anchor', 'start')
    .style('font-size', 'x-small')
    .style('fill', 'gray')
    .style('pointer-events', 'none')
    .text(DATE_FORMATTER(projectionStartTimestamp));
  scrollBarGroupElement
    .append('text')
    .classed('scrollbar-range-end', true)
    .attr('x', scrollBarWidth)
    .attr('y', scrollbarLabelYOffset)
    .style('text-anchor', 'end')
    .style('font-size', 'x-small')
    .style('fill', 'gray')
    .style('pointer-events', 'none')
    .text(DATE_FORMATTER(projectionEndTimestamp));
  // Don't let user accidentally click/select text in the scrollbar
  scrollBarGroupElement.selectAll('text').style('pointer-events', 'none');
};

export default function render(
  selection: D3Selection,
  timeseries: TimeseriesPointProjected[],
  totalWidth: number,
  totalHeight: number,
  projectionStartTimestamp: number,
  projectionEndTimestamp: number,
  isWeightedSum: boolean,
  color = 'black'
) {
  // Clear any existing elements
  selection.selectAll('*').remove();
  // Add chart `g` element to the page
  const focusGroupElement = selection.append('g').classed('focusGroupElement', true);
  // Add scroll bar `g` element to the page
  const scrollBarGroupElement = selection.append('g').classed('scrollBarGroupElement', true);
  // Add background to scrollbar
  const scrollBarBackground = scrollBarGroupElement
    .append('rect')
    .attr('y', 0)
    .attr('x', PADDING_LEFT)
    .attr('height', SCROLL_BAR_HEIGHT)
    .attr('stroke', 'none')
    .attr('fill', SCROLL_BAR_BACKGROUND_COLOR)
    .attr('fill-opacity', SCROLL_BAR_BACKGROUND_OPACITY);
  // Initialize focused range to the entire time range
  let focusedTimeRange: [number, number] = [projectionStartTimestamp, projectionEndTimestamp];

  /**
   * Validates that the new time range values are within the projection range, and that the start
   * is less than or equal to the end.
   * Invalid focus ranges can occur if the page is resized or if the projection ranges change.
   */
  const setFocusedTimeRange = (newValues: [number, number]) => {
    const focusEndBeforeProjectionEnd = Math.min(projectionEndTimestamp, newValues[1]);
    const focusRangeStartAfterProjectionStart = Math.max(projectionStartTimestamp, newValues[0]);
    const focusRangeStartBeforeFocusEnd = Math.min(
      focusRangeStartAfterProjectionStart,
      focusEndBeforeProjectionEnd
    );
    focusedTimeRange = [focusRangeStartBeforeFocusEnd, focusEndBeforeProjectionEnd];
  };

  // Calculate scales to map the date and value ranges to pixels for the main "focus" area
  const focusHeight = totalHeight - PADDING_TOP - X_AXIS_HEIGHT - SCROLL_BAR_HEIGHT;
  const chartWidth = totalWidth - PADDING_LEFT - PADDING_RIGHT;

  const renderFocusChart = () => {
    focusGroupElement.selectAll('*').remove();

    // Render focus chart X axis
    const xScaleFocus = d3.scaleLinear().domain(focusedTimeRange).range([PADDING_LEFT, chartWidth]);
    const xAxisTicks = calculateYearlyTicks(
      xScaleFocus.domain()[0],
      xScaleFocus.domain()[1],
      totalWidth
    );
    const yOffset = focusHeight - X_AXIS_HEIGHT;
    renderXaxis(focusGroupElement, xScaleFocus, xAxisTicks, yOffset, DATE_FORMATTER);

    // Render timeseries itself
    const yScaleFocus = d3
      .scaleLinear()
      .domain([0, 1])
      .range([focusHeight - X_AXIS_HEIGHT, PADDING_TOP]);
    renderTimeseries(timeseries, focusGroupElement, xScaleFocus, yScaleFocus, isWeightedSum, color);

    // Don't render anything outside the main graph area (except the axes)
    focusGroupElement
      .selectChildren('*:not(.xAxis):not(.yAxis)')
      .attr('clip-path', 'url(#clipping-mask)');
  };

  // Scroll bar (lets the user zoom and pan)
  const xScaleScrollbar = d3
    .scaleLinear()
    .domain([projectionStartTimestamp, projectionEndTimestamp])
    .range([PADDING_LEFT, chartWidth]);
  // Move scrollBarGroupElement below the focus group element and resize it horizontally.
  scrollBarGroupElement.attr('transform', translate(0, focusHeight));
  scrollBarBackground.attr('width', chartWidth);
  // Render timeseries to scrollbar and fade it out.
  const yScaleScrollbar = d3.scaleLinear().domain([0, 1]).range([SCROLL_BAR_HEIGHT, 0]);
  renderTimeseries(
    timeseries,
    scrollBarGroupElement,
    xScaleScrollbar,
    yScaleScrollbar,
    isWeightedSum,
    color
  );
  scrollBarGroupElement
    .selectAll('.segment-line, .circle')
    .attr('opacity', SCROLL_BAR_TIMESERIES_OPACITY);
  // Render time range labels
  renderScrollBarLabels(
    scrollBarGroupElement,
    chartWidth,
    projectionStartTimestamp,
    projectionEndTimestamp
  );
  // Add brush element to the scroll bar
  scrollBarGroupElement.select('.brush').remove();
  const brushElement = scrollBarGroupElement.append('g').classed('brush', true);
  // Add background to selected range
  selection
    .selectAll('.brush > .selection')
    .attr('fill', SCROLL_BAR_RANGE_FILL)
    .attr('stroke', SCROLL_BAR_RANGE_STROKE)
    .attr('opacity', SCROLL_BAR_RANGE_OPACITY);
  // Update brush element size/position and handlers
  const handleScrollBarChange = ({ selection }: { selection: number[] | null }) => {
    if (selection === null) {
      return;
    }
    // Convert positions to timestamps and store the new values
    setFocusedTimeRange([
      xScaleScrollbar.invert(selection[0]),
      xScaleScrollbar.invert(selection[1]),
    ]);
    // Update brush handle positions
    brushElement.call(renderBrushHandles, focusedTimeRange.map(xScaleScrollbar));
    // Re-render the chart using the new focused range
    renderFocusChart();
  };
  const d3BrushBehaviour = d3
    .brushX()
    .extent([
      [xScaleScrollbar.range()[0], 0],
      [xScaleScrollbar.range()[1], SCROLL_BAR_HEIGHT],
    ])
    .on('start brush end', handleScrollBarChange);
  // Connect behaviour to element
  brushElement.call(d3BrushBehaviour);
  // Move handles to focusedTimeRange
  brushElement.call(d3BrushBehaviour.move, focusedTimeRange.map(xScaleScrollbar));

  // Add clipping mask to hide elements that are outside the focus chart area when zoomed in
  selection
    .append('defs')
    .append('clipPath')
    .attr('id', 'clipping-mask')
    .append('rect')
    .attr('width', chartWidth)
    .attr('height', focusHeight)
    .attr('transform', translate(PADDING_RIGHT, PADDING_TOP));
}
