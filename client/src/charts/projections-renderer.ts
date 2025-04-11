import _ from 'lodash';
import * as d3 from 'd3';
import { v4 as uuidv4 } from 'uuid';
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

const FOCUS_BORDER_COLOR = '#d1d5db';
const FOCUS_BORDER_STROKE_WIDTH = 1;

export const PADDING_TOP = 5;
// PADDING_LEFT should be kept in sync with `index-projections-expanded-node.vue/$chartPadding`.
//  See comment in that component for more details.
const PADDING_LEFT = 20;
const PADDING_RIGHT = 0;
export const X_AXIS_HEIGHT = 20;
export const Y_AXIS_WIDTH = PADDING_LEFT;
const AXIS_TICK_LENGTH = 2;

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

export const renderTimeseries = (
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

export default function render(
  selection: D3Selection,
  timeseriesList: ProjectionTimeseries[],
  totalWidth: number,
  totalHeight: number,
  focusStartTimestamp: number,
  focusEndTimestamp: number,
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
  const yScaleDomain = showDataOutsideNorm ? [globalMinY, Math.min(1, globalMaxY)] : [0, 1];

  const focusedTimeRange = [focusStartTimestamp, focusEndTimestamp];

  // Clear any existing elements
  selection.selectAll('*').remove();
  // Add chart `g` element to the page
  const focusGroupElement = selection.append('g').classed('focusGroupElement', true);
  // Create element over focus chart to detect mouse events
  const focusMouseEventGroup = selection.append('g').classed('focusMouseEventGroup', true);

  // Calculate scales to map the date and value ranges to pixels for the main "focus" area
  const focusHeight = totalHeight - PADDING_TOP;
  const chartWidth = totalWidth - PADDING_LEFT - PADDING_RIGHT;
  const focusChartHeight = focusHeight - X_AXIS_HEIGHT;

  const focusMouseEventArea = focusMouseEventGroup
    .append('rect')
    .attr('height', focusChartHeight)
    .attr('width', chartWidth)
    .attr('x', PADDING_LEFT)
    .attr('y', PADDING_TOP)
    .attr('fill', 'transparent');

  const focusChartClippingMaskId = `clipping-mask-${uuidv4()}`;
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
      .attr('clip-path', `url(#${focusChartClippingMaskId})`);
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

  // Add clipping mask to hide elements that are outside the focus chart area when zoomed in
  selection
    .append('defs')
    .append('clipPath')
    .attr('id', focusChartClippingMaskId)
    .append('rect')
    .attr('width', chartWidth)
    .attr('height', focusChartHeight)
    .attr('transform', translate(PADDING_LEFT, PADDING_TOP));
}
