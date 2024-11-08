import _ from 'lodash';
import * as d3 from 'd3';
import dateFormatter from '@/formatters/date-formatter';
import { D3GElementSelection, D3ScaleLinear, D3Selection } from '@/types/D3';
import { ProjectionTimeseries, TimeseriesPointProjected } from '@/types/Timeseries';
import {
  calculateYearlyTicks,
  renderDashedLine,
  renderLine,
  renderPoint,
  renderSquares,
  renderXaxis,
  renderYaxis,
  invertTimeseriesList,
  timeseriesExtrema,
  renderXAxisLine,
} from '@/utils/timeseries-util';
import { showSvgTooltip, hideSvgTooltip, translate } from '@/utils/svg-util';
import { ProjectionPointType } from '@/types/Enums';
import { splitProjectionsIntoLineSegments } from '@/utils/projection-util';
import { snapTimestampToNearestMonth } from '@/utils/date-util';
import { COLOR_SCHEME } from '@/utils/colors-util';

const FOCUS_BORDER_COLOR = '#888';
const FOCUS_BORDER_STROKE_WIDTH = 1;
const HISTORICAL_RANGE_OPACITY = 0.05;
export const SCROLL_BAR_HEIGHT = 20;
const SCROLL_BAR_RANGE_FILL = '#ccc';
const SCROLL_BAR_RANGE_STROKE = 'none';
const SCROLL_BAR_RANGE_OPACITY = 0.8;
const SCROLL_BAR_BACKGROUND_COLOR = '#888';
const SCROLL_BAR_BACKGROUND_OPACITY = HISTORICAL_RANGE_OPACITY;
const SCROLL_BAR_TIMESERIES_OPACITY = 0.2;
const SCROLL_BAR_HANDLE_WIDTH = 9;
const SCROLL_BAR_LABEL_WIDTH = 40;

export const PADDING_TOP = 5;
// PADDING_LEFT should be kept in sync with `index-projections-expanded-node.vue/$chartPadding`.
//  See comment in that component for more details.
const PADDING_LEFT = 20;
const PADDING_RIGHT = 0;
export const X_AXIS_HEIGHT = 20;
export const Y_AXIS_WIDTH = PADDING_LEFT;
const AXIS_TICK_LENGTH = 2;
export const SCROLL_BAR_TOP_MARGIN = 5;

const DASHED_LINE = {
  length: 4,
  gap: 4,
  width: 1,
};

const NORMAL_LIMITS_DASHED_LINE = {
  length: 2,
  gap: 2,
  width: 0.5,
};

const SOLID_LINE_WIDTH = 1;
const WEIGHTED_SUM_LINE_OPACITY = 0.25;
const POINT_RADIUS = 3;
const CONSTRAINT_SIDE_LENGTH = 4;

// The SVG element attribute where we store the focused time range so it can be persisted across
//  renders.
const PERSISTED_TIME_RANGE_ATTRIBUTE = 'data-time-range';

const DATE_FORMATTER = (value: any) => dateFormatter(value, 'MMM YYYY');
const VALUE_FORMATTER = (value: number) => value.toPrecision(2);

const getTimestampAndValueFromMouseEvent = (
  event: MouseEvent,
  xScale: D3ScaleLinear,
  yScale: D3ScaleLinear
) => {
  const [pointerX, pointerY] = d3.pointer(event);
  const timestampAtMouse = xScale.invert(pointerX);
  const snappedTimestamp = snapTimestampToNearestMonth(timestampAtMouse);
  const value = yScale.invert(pointerY);
  return {
    timestamp: snappedTimestamp,
    value,
  };
};

const renderTimeseries = (
  timeseries: TimeseriesPointProjected[],
  parentGroupElement: D3GElementSelection,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  isWeightedSum: boolean,
  color = 'black'
) => {
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
  } else {
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
  }
  // Render a circle at any point where all inputs have historical data
  const fullDataPoints = timeseries.filter(
    (point) => point.projectionType === ProjectionPointType.Historical
  );
  const pointsGroupElement = parentGroupElement.append('g');
  renderPoint(pointsGroupElement, fullDataPoints, xScale, yScale, color, POINT_RADIUS);
  // Render a square at any point where one or more inputs have a constraint
  const constraints = timeseries.filter(
    (point) => point.projectionType === ProjectionPointType.Constraint
  );
  renderSquares(pointsGroupElement, constraints, xScale, yScale, color, CONSTRAINT_SIDE_LENGTH);
};

const renderBrushHandles = (g: D3GElementSelection, handlePositions: [number, number]) => {
  g.selectAll('.custom-handle')
    .data(handlePositions)
    .join((enter) => {
      const handleWidth = 9;
      const handleWidthGap = -2;
      const container = enter
        .append('g')
        .attr('class', 'custom-handle')
        .attr('cursor', 'ew-resize')
        .attr('pointer-events', 'none');
      container
        .append('rect')
        .attr('fill', '#f8f8f8')
        .attr('stroke', '#888888')
        .attr('y', 0)
        .attr('x', (d, i) => (i === 0 ? -(handleWidth + handleWidthGap) : handleWidthGap))
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('width', handleWidth)
        .attr('height', SCROLL_BAR_HEIGHT);
      // Vertical dots
      [0.3, 0.5, 0.7].forEach((value) => {
        container
          .append('circle')
          .attr('cx', (d, i) =>
            i === 0 ? -(0.5 * handleWidth + handleWidthGap) : 0.5 * handleWidth + handleWidthGap
          )
          .attr('cy', SCROLL_BAR_HEIGHT * value)
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
  const scrollbarLabelYOffset = 14;
  scrollBarGroupElement.select('.scrollbar-range-start').remove();
  scrollBarGroupElement.select('.scrollbar-range-end').remove();
  scrollBarGroupElement
    .append('text')
    .classed('scrollbar-range-start', true)
    .attr('x', PADDING_LEFT)
    .attr('y', scrollbarLabelYOffset)
    .style('text-anchor', 'start')
    .style('font-size', 'x-small')
    .style('fill', 'gray')
    .style('pointer-events', 'none')
    .text(DATE_FORMATTER(projectionStartTimestamp));
  scrollBarGroupElement
    .append('text')
    .classed('scrollbar-range-end', true)
    .attr('x', scrollBarWidth - PADDING_RIGHT)
    .attr('y', scrollbarLabelYOffset)
    .style('text-anchor', 'end')
    .style('font-size', 'x-small')
    .style('fill', 'gray')
    .style('pointer-events', 'none')
    .text(DATE_FORMATTER(projectionEndTimestamp));
  // Don't let user accidentally click/select text in the scrollbar
  scrollBarGroupElement.selectAll('text').style('user-select', 'none');
};

export default function render(
  selection: D3Selection,
  timeseriesList: ProjectionTimeseries[],
  totalWidth: number,
  totalHeight: number,
  projectionStartTimestamp: number,
  projectionEndTimestamp: number,
  isWeightedSum: boolean,
  onClick: (timestamp: number, value: number) => void,
  isInverted: boolean,
  showDataOutsideNorm: boolean
) {
  let tsList: ProjectionTimeseries[];
  if (isInverted) {
    tsList = invertTimeseriesList(_.cloneDeep(timeseriesList));
  } else {
    tsList = timeseriesList;
  }

  const { globalMaxY, globalMinY } = timeseriesExtrema(tsList);
  const yScaleDomain = showDataOutsideNorm ? [globalMinY, globalMaxY < 1 ? 1 : globalMaxY] : [0, 1];

  // Initialize focused range to the entire time range
  let focusedTimeRange = [projectionStartTimestamp, projectionEndTimestamp];
  // If we're re-rendering, preserve the focused time range from the previous render
  const previousFocusGroupElement = selection.select('.focusGroupElement');
  const previousFocusedTimeRange =
    previousFocusGroupElement.size() > 0
      ? previousFocusGroupElement.attr(PERSISTED_TIME_RANGE_ATTRIBUTE)
      : null;
  if (previousFocusedTimeRange !== null) {
    focusedTimeRange = JSON.parse(previousFocusedTimeRange);
  }
  // Clear any existing elements
  selection.selectAll('*').remove();
  // Add chart `g` element to the page
  const focusGroupElement = selection.append('g').classed('focusGroupElement', true);
  // Create element over focus chart to detect mouse events
  const focusMouseEventGroup = selection.append('g').classed('focusMouseEventGroup', true);
  // Add scroll bar `g` element to the page
  const scrollBarGroupElement = selection.append('g').classed('scrollBarGroupElement', true);
  // Add background to scrollbar
  const scrollBarBackground = scrollBarGroupElement
    .append('rect')
    .attr('y', 0)
    .attr('x', PADDING_LEFT + SCROLL_BAR_LABEL_WIDTH + SCROLL_BAR_HANDLE_WIDTH)
    .attr('height', SCROLL_BAR_HEIGHT)
    .attr('stroke', 'none')
    .attr('fill', SCROLL_BAR_BACKGROUND_COLOR)
    .attr('fill-opacity', SCROLL_BAR_BACKGROUND_OPACITY);

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
    // Store the new time range on the focus group element as an attribute so it can be preserved
    //  across renders.
    focusGroupElement.attr(PERSISTED_TIME_RANGE_ATTRIBUTE, JSON.stringify(focusedTimeRange));
  };

  // Calculate scales to map the date and value ranges to pixels for the main "focus" area
  const focusHeight = totalHeight - PADDING_TOP - SCROLL_BAR_HEIGHT - SCROLL_BAR_TOP_MARGIN;
  const chartWidth = totalWidth - PADDING_LEFT - PADDING_RIGHT;
  const focusChartHeight = focusHeight - X_AXIS_HEIGHT;

  const focusMouseEventArea = focusMouseEventGroup
    .append('rect')
    .attr('height', focusChartHeight)
    .attr('width', chartWidth)
    .attr('x', PADDING_LEFT)
    .attr('y', PADDING_TOP)
    .attr('fill', 'transparent');

  const renderFocusChart = (xScale: D3ScaleLinear, yScale: D3ScaleLinear) => {
    focusGroupElement.selectAll('*').remove();

    // Render border
    focusGroupElement
      .append('rect')
      .attr('height', focusChartHeight)
      .attr('width', chartWidth)
      .attr('x', PADDING_LEFT)
      .attr('y', PADDING_TOP)
      .attr('fill', 'transparent')
      .attr('stroke', FOCUS_BORDER_COLOR)
      .attr('stroke-width', FOCUS_BORDER_STROKE_WIDTH);

    // Render focus chart X axis
    const xAxisTicks = calculateYearlyTicks(xScale.domain()[0], xScale.domain()[1], totalWidth);
    const xAxisElement = renderXaxis(
      focusGroupElement,
      xScale,
      xAxisTicks,
      PADDING_TOP + focusChartHeight,
      DATE_FORMATTER,
      AXIS_TICK_LENGTH
    );
    xAxisElement.select('.domain').remove();
    xAxisElement.selectAll('.tick > line').attr('stroke', FOCUS_BORDER_COLOR);

    const yAxisElement = renderYaxis(
      focusGroupElement,
      yScale,
      yScaleDomain,
      (number) => (number === 0 || number === 1 ? number : number.toFixed(1)),
      Y_AXIS_WIDTH,
      Y_AXIS_WIDTH - AXIS_TICK_LENGTH,
      showDataOutsideNorm
    );
    yAxisElement.select('.domain').remove();
    yAxisElement.selectAll('.tick > line').attr('stroke', FOCUS_BORDER_COLOR);

    // Render timeseries itself
    tsList.forEach((timeseries) => {
      const timeseriesGroup = focusGroupElement.append('g').classed('timeseries', true);
      renderTimeseries(
        timeseries.points,
        timeseriesGroup,
        xScale,
        yScale,
        isWeightedSum,
        timeseries.color
      );
    });
    if (showDataOutsideNorm) {
      [0, 1].forEach((y) => {
        renderXAxisLine(
          focusGroupElement,
          0,
          totalWidth,
          yScale(y),
          NORMAL_LIMITS_DASHED_LINE.length,
          NORMAL_LIMITS_DASHED_LINE.gap,
          COLOR_SCHEME.GREYS_7[2],
          NORMAL_LIMITS_DASHED_LINE.width
        );
      });
    }

    // Don't render anything outside the main graph area (except the axes)
    focusGroupElement
      .selectChildren('*:not(.xAxis):not(.yAxis)')
      .attr('clip-path', 'url(#clipping-mask)');
  };

  // Update mouse handlers when the user changes the xScale by moving the scrollbar.
  const updateFocusMouseEventArea = (xScale: D3ScaleLinear, yScale: D3ScaleLinear) => {
    focusMouseEventArea.on('mousemove', (event: MouseEvent) => {
      const { timestamp, value } = getTimestampAndValueFromMouseEvent(event, xScale, yScale);
      showSvgTooltip(
        focusMouseEventGroup,
        `${VALUE_FORMATTER(value)}\n${DATE_FORMATTER(timestamp)}`,
        [xScale(timestamp), yScale(value)],
        0,
        true
      );
    });
    focusMouseEventArea.on('mouseleave', function () {
      hideSvgTooltip(focusMouseEventGroup);
    });
    focusMouseEventArea.on('click', function (event) {
      const { timestamp, value } = getTimestampAndValueFromMouseEvent(event, xScale, yScale);
      onClick(timestamp, value);
    });
  };

  // Scroll bar (lets the user zoom and pan)
  const xScaleScrollbar = d3
    .scaleLinear()
    .domain([projectionStartTimestamp, projectionEndTimestamp])
    .range([
      PADDING_LEFT + SCROLL_BAR_LABEL_WIDTH + SCROLL_BAR_HANDLE_WIDTH,
      totalWidth - PADDING_RIGHT - SCROLL_BAR_LABEL_WIDTH - SCROLL_BAR_HANDLE_WIDTH,
    ]);
  // Move scrollBarGroupElement below the focus group element and resize it horizontally.
  scrollBarGroupElement.attr('transform', translate(0, focusHeight + SCROLL_BAR_TOP_MARGIN));
  scrollBarBackground.attr(
    'width',
    chartWidth - 2 * (SCROLL_BAR_LABEL_WIDTH + SCROLL_BAR_HANDLE_WIDTH)
  );
  // Render timeseries to scrollbar and fade it out.
  const yScaleScrollbar = d3.scaleLinear().domain(yScaleDomain).range([SCROLL_BAR_HEIGHT, 0]);
  tsList.forEach((timeseries) => {
    const timeseriesGroup = scrollBarGroupElement.append('g').classed('timeseries', true);
    renderTimeseries(
      timeseries.points,
      timeseriesGroup,
      xScaleScrollbar,
      yScaleScrollbar,
      isWeightedSum,
      timeseries.color
    );
  });
  scrollBarGroupElement
    .selectAll('.segment-line, .circle, .square')
    .attr('opacity', SCROLL_BAR_TIMESERIES_OPACITY);
  // Render time range labels
  renderScrollBarLabels(
    scrollBarGroupElement,
    totalWidth,
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
    const xScaleFocus = d3
      .scaleLinear()
      .domain(focusedTimeRange)
      .range([PADDING_LEFT, PADDING_LEFT + chartWidth]);
    const yScaleFocus = d3
      .scaleLinear()
      .domain(yScaleDomain)
      .range([PADDING_TOP + focusChartHeight - FOCUS_BORDER_STROKE_WIDTH, PADDING_TOP]);
    renderFocusChart(xScaleFocus, yScaleFocus);
    updateFocusMouseEventArea(xScaleFocus, yScaleFocus);
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
    .attr('height', focusChartHeight)
    .attr('transform', translate(PADDING_LEFT, PADDING_TOP));
}
