import _ from 'lodash';
import dateFormatter from '@/formatters/date-formatter';
import { CAGModelSummary, ProjectionConstraint, ScenarioProjection } from '@/types/CAG';
import { D3GElementSelection, D3ScaleLinear, D3Selection } from '@/types/D3';
import { TimeseriesPoint } from '@/types/Timeseries';
import { chartValueFormatter } from '@/utils/string-util';
import { calculateGenericTicks, calculateYearlyTicks, renderLine, renderXaxis, renderYaxis } from '@/utils/timeseries-util';
import * as d3 from 'd3';
import {
  hideSvgTooltip,
  showSvgTooltip,
  translate
} from '@/utils/svg-util';
import { SELECTED_COLOR } from '@/utils/colors-util';
import { getTimestampAfterMonths, roundToNearestMonth } from '@/utils/date-util';
import {
  getMonthsPerTimestepFromTimeScale,
  getStepCountFromTimeScale,
  getTimeScaleOption
} from '@/utils/time-scale-util';

import {
  calculateTypicalChangeBracket,
  convertDistributionTimeseriesToRidgelines
} from '@/utils/ridgeline-util';

import { TimeScale } from '@/types/Enums';
import { renderRidgelines } from './ridgeline-renderer';
import { historicalDataUncertaintyColor } from '@/services/model-service';

const HISTORICAL_DATA_COLOR = '#888';
const HISTORICAL_RANGE_OPACITY = 0.05;
const SCROLL_BAR_HEIGHT_PERCENTAGE = 0.13;
const SCROLL_BAR_RANGE_FILL = '#ccc';
const SCROLL_BAR_RANGE_STROKE = 'none';
const SCROLL_BAR_RANGE_OPACITY = 0.8;
const SCROLL_BAR_BACKGROUND_COLOR = HISTORICAL_DATA_COLOR;
const SCROLL_BAR_BACKGROUND_OPACITY = HISTORICAL_RANGE_OPACITY;
const SCROLL_BAR_TIMESERIES_OPACITY = 0.2;
const GRIDLINE_COLOR = '#eee';
const MAJOR_TICK_COLOR = '#A9A9A9';
const MAJOR_TICK_LABEL_SIZE = 10;

const X_AXIS_HEIGHT = 20;
const Y_AXIS_WIDTH = 40;
const PADDING_TOP = 10;
const PADDING_RIGHT = 40;

const CONSTRAINT_RADIUS = 4;
const CONSTRAINT_HOVER_RADIUS = CONSTRAINT_RADIUS * 1.5;

/** How many positions on the Y axis the user's mouse position will
  be snapped to. */
const DISCRETE_Y_POSITION_COUNT = 31;

const DATE_FORMATTER = (value: any) => dateFormatter(value, 'MMM YYYY');

export default function(
  selection: D3Selection,
  totalWidth: number,
  totalHeight: number,
  historicalTimeseries: TimeseriesPoint[],
  projections: ScenarioProjection[],
  selectedScenarioId: string | null,
  constraints: ProjectionConstraint[],
  minValue: number,
  maxValue: number,
  unit: string,
  modelSummary: CAGModelSummary,
  viewingExtent: number[] | null,
  isClampAreaHidden: boolean,
  setConstraints: (newConstraints: ProjectionConstraint[]) => void,
  setHistoricalTimeseries: (newPoints: TimeseriesPoint[]) => void
) {
  // FIXME: Tie data to group element, should make renderer stateful instead of a single function
  let oldCoords: number[] = [];
  const oldG = selection.select('.scrollBarGroupElement');
  if (oldG.size() === 1 && !_.isEmpty(oldG.datum())) {
    oldCoords = oldG.datum();
  }
  selection.selectAll('*').remove();

  if (projections.length === 0) return;
  const [xExtent, yExtent] = calculateExtents(
    modelSummary,
    historicalTimeseries,
    projections,
    minValue,
    maxValue,
    isClampAreaHidden
  );
  if (xExtent[0] === undefined || yExtent[0] === undefined) {
    console.error('TD Node Renderer: unable to derive extent from data');
    return;
  }

  if (viewingExtent != null) {
    if (viewingExtent[0] < xExtent[0]) {
      viewingExtent[0] = xExtent[0];
    }
  }

  const valueFormatter = chartValueFormatter(...yExtent);

  // Build main "focus" chart scales and group element
  const focusHeight = totalHeight * (1 - SCROLL_BAR_HEIGHT_PERCENTAGE);
  const [xScaleFocus, yScaleFocus] = calculateScales(
    totalWidth - PADDING_RIGHT,
    focusHeight - PADDING_TOP - X_AXIS_HEIGHT,
    PADDING_TOP,
    Y_AXIS_WIDTH,
    xExtent,
    yExtent
  );
  const focusGroupElement = selection
    .append('g')
    .classed('focusGroupElement', true);

  // Build scroll bar for zooming and panning
  const scrollBarHeight = totalHeight * SCROLL_BAR_HEIGHT_PERCENTAGE;
  const [xScaleScrollbar, yScaleScrollbar] = calculateScales(
    totalWidth - PADDING_RIGHT,
    scrollBarHeight,
    0,
    Y_AXIS_WIDTH,
    xExtent,
    yExtent
  );
  const scrollBarGroupElement = selection
    .append('g')
    .classed('scrollBarGroupElement', true);

  // Add background to scrollbar
  scrollBarGroupElement
    .append('rect')
    .attr('y', 0)
    .attr('x', Y_AXIS_WIDTH)
    .attr('height', scrollBarHeight)
    .attr('width', totalWidth - Y_AXIS_WIDTH - PADDING_RIGHT)
    .attr('stroke', 'none')
    .attr('fill', SCROLL_BAR_BACKGROUND_COLOR)
    .attr('fill-opacity', SCROLL_BAR_BACKGROUND_OPACITY);

  // move scroll bar to bottom
  scrollBarGroupElement.attr('transform', translate(0, focusHeight));
  // Render timeseries in the scrollbar chart, then fade them out
  renderHistoricalTimeseries(
    historicalTimeseries,
    scrollBarGroupElement,
    xScaleScrollbar,
    yScaleScrollbar
  );
  scrollBarGroupElement
    .selectAll('.segment-line')
    .attr('opacity', SCROLL_BAR_TIMESERIES_OPACITY);

  // Create brush object and position over scroll bar
  const brush = d3
    .brushX()
    .extent([
      [xScaleScrollbar.range()[0], yScaleScrollbar.range()[1]],
      [xScaleScrollbar.range()[1], yScaleScrollbar.range()[0]]
    ])
    .on('start brush end', brushed);

  // Use viewingExtent to constrain focus if applicable
  if (oldCoords.length === 0 && viewingExtent !== null) {
    oldCoords.push(xScaleFocus(viewingExtent[0]));
    oldCoords.push(xScaleFocus(viewingExtent[1]));
  }

  scrollBarGroupElement
    .append('g') // create brush element and move to default
    .classed('brush', true)
    .call(brush)
    // set initial brush selection to entire context
    .call(brush.move, oldCoords.length === 2 ? oldCoords : xScaleFocus.range());
  selection
    .selectAll('.brush > .selection')
    .attr('fill', SCROLL_BAR_RANGE_FILL)
    .attr('stroke', SCROLL_BAR_RANGE_STROKE)
    .attr('opacity', SCROLL_BAR_RANGE_OPACITY);

  // Add clipping mask to hide elements that are outside the focus chart area when zoomed in
  // Note We need a little extra buffer to accommodate extra visuals in the last projected timestamp
  const buffer = isClampAreaHidden ? 0 : 20;
  selection
    .append('defs')
    .append('clipPath')
    .attr('id', 'clipping-mask')
    .append('rect')
    .attr('width', buffer + xScaleFocus.range()[1] - xScaleFocus.range()[0])
    .attr('height', yScaleFocus.range()[0] - yScaleFocus.range()[1])
    .attr('transform', translate(PADDING_RIGHT, PADDING_TOP));


  function brushHandle(g: D3GElementSelection, selection: number[]) {
    const enterFn = (enter: D3Selection) => {
      const handleW = 9;
      const handleWGap = -2;
      const handleHGap = 0;
      const handleH = (SCROLL_BAR_HEIGHT_PERCENTAGE * totalHeight) - 2 * handleHGap;

      const container = enter.append('g')
        .attr('class', 'custom-handle')
        .attr('cursor', 'ew-resize');

      container.append('rect')
        .attr('fill', '#f8f8f8')
        .attr('stroke', '#888888')
        .attr('y', handleHGap)
        .attr('x', (d, i) => i === 0 ? -(handleW + handleWGap) : handleWGap)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('width', handleW)
        .attr('height', handleH);

      // Vertical dots
      [0.3, 0.5, 0.7].forEach(value => {
        container.append('circle')
          .attr('cx', (d, i) => i === 0 ? -(0.5 * handleW + handleWGap) : 0.5 * handleW + handleWGap)
          .attr('cy', handleHGap + handleH * value)
          .attr('r', 1.25)
          .attr('fill', '#888888');
      });
    };

    g.selectAll('.custom-handle')
      .data([{ type: 'w' }, { type: 'e' }])
      .join(enterFn as any)
      .attr('transform', (d, i) => translate(selection[i], 0));
  }


  // Redraw chart whenever axis is brushed
  //  Also gets called with "initialBrushSelection"
  function brushed({ selection }: { selection: number[] }) {
    // FIXME: Tie data to group element, should make renderer stateful instead of a single function
    scrollBarGroupElement.datum(selection);
    scrollBarGroupElement.select('.brush').call(brushHandle as any, selection);

    const [x0, x1] = selection.map(xScaleScrollbar.invert);
    xScaleFocus.domain([x0, x1]);
    focusGroupElement.selectAll('*').remove();

    renderStaticElements(
      focusGroupElement,
      scrollBarGroupElement,
      totalWidth,
      xScaleFocus,
      yScaleFocus,
      PADDING_TOP,
      historicalTimeseries,
      modelSummary
    );
    const xAxisTicksFocus = calculateYearlyTicks(
      xScaleFocus.domain()[0],
      xScaleFocus.domain()[1],
      totalWidth
    );
    const yAxisTicksFocus = calculateGenericTicks(
      yScaleFocus.domain()[0],
      yScaleFocus.domain()[1]
    );
    const yOffset = focusHeight - X_AXIS_HEIGHT;
    const xOffset = totalWidth - PADDING_RIGHT;

    renderXaxis(
      focusGroupElement,
      xScaleFocus,
      xAxisTicksFocus,
      yOffset,
      DATE_FORMATTER
    );
    renderYaxis(
      focusGroupElement,
      yScaleFocus,
      yAxisTicksFocus,
      valueFormatter,
      xOffset,
      Y_AXIS_WIDTH
    );

    focusGroupElement.selectAll('.yAxis .domain').remove();
    focusGroupElement.selectAll('.yAxis .tick line').remove();
    renderHistoricalTimeseries(
      historicalTimeseries,
      focusGroupElement,
      xScaleFocus,
      yScaleFocus
    );
    const { projection_start, time_scale } = modelSummary.parameter;
    // get the correct number of steps based on the currently selected time_scale
    //  rather than the deprecated value from the parameter.num_steps
    const num_steps = getStepCountFromTimeScale(modelSummary.parameter.time_scale);

    if (selectedScenarioId !== null) {
      renderProjectionRidgelines(
        focusGroupElement,
        projections,
        selectedScenarioId,
        minValue,
        maxValue,
        historicalTimeseries,
        time_scale,
        PADDING_TOP,
        projection_start,
        xScaleFocus,
        yScaleFocus
      );
    }

    renderConstraints(
      focusGroupElement,
      historicalTimeseries,
      constraints,
      projection_start,
      time_scale,
      xScaleFocus,
      yScaleFocus
    );
    generateClickableAreas(
      focusGroupElement,
      xScaleFocus,
      yScaleFocus,
      historicalTimeseries,
      constraints,
      unit,
      projection_start,
      num_steps,
      time_scale,
      setConstraints,
      setHistoricalTimeseries
    );
    // Render major tick labels overtop of ridgelines
    focusGroupElement.selectAll('.major-tick-label').raise();
    // Don't render anything outside the main graph area (except the axes)
    focusGroupElement
      .selectChildren('*:not(.xAxis):not(.yAxis)')
      .attr('clip-path', 'url(#clipping-mask)');
  }
}

const calculateExtents = (
  modelSummary: CAGModelSummary,
  historicalTimeseries: TimeseriesPoint[],
  projections: ScenarioProjection[],
  minValue: number,
  maxValue: number,
  isClampAreaHidden: boolean
) => {
  let xExtent: [number, number] = [0, 1];
  const getTimestampFromPoint = (point: { timestamp: number }) => point.timestamp;

  if (!isClampAreaHidden) {
    const projectedPoints = projections.flatMap(projection => projection.values);
    const projectedTimestamps = projectedPoints.map(getTimestampFromPoint);
    xExtent = d3.extent([
      ...historicalTimeseries.map(getTimestampFromPoint),
      ...projectedTimestamps
    ]) as [number, number];
  } else {
    // if clamps are hidden, go up to the first projected points (basically projection_start)
    xExtent = d3.extent([
      ...historicalTimeseries.map(getTimestampFromPoint),
      modelSummary.parameter.projection_start
    ]) as [number, number];
  }
  const yExtent = d3.extent([minValue, maxValue]);
  return [xExtent, yExtent];
};

const calculateScales = (
  width: number,
  height: number,
  top: number,
  left: number,
  xExtent: [number, number],
  yExtent: [number, number]
) => {
  const xScale = d3
    .scaleLinear()
    .domain(xExtent)
    .range([left, width]);
  const yScale = d3
    .scaleLinear()
    .domain(yExtent)
    .range([height + top, top]);
  return [xScale, yScale];
};

const renderStaticElements = (
  groupElement: D3GElementSelection,
  scrollbarGroupElement: D3GElementSelection,
  totalWidth: number,
  xScale: D3ScaleLinear,
  yScale: D3ScaleLinear,
  offsetFromTop: number,
  historicalTimeseries: TimeseriesPoint[],
  modelSummary: CAGModelSummary
) => {
  const {
    projection_start: projectionStartTimestamp,
    time_scale: timeScale
  } = modelSummary.parameter;
  const stepCount = getStepCountFromTimeScale(timeScale);
  const monthsPerTimestep = getMonthsPerTimestepFromTimeScale(timeScale);
  const stepTimestamps = _.range(stepCount).map(stepIndex =>
    getTimestampAfterMonths(
      projectionStartTimestamp,
      stepIndex * monthsPerTimestep
    )
  );
  // Draw a vertical line at each step
  const bottomYValue = offsetFromTop + yScale.range()[0] - yScale.range()[1];
  const lineGenerator = d3
    .line<{ timestamp: number; isBottom: boolean }>()
    .x(d => xScale(d.timestamp))
    .y(d =>
      d.isBottom ? bottomYValue : offsetFromTop
    );
  groupElement
    .selectAll('.grid-timestamp-line')
    .data(stepTimestamps)
    .join('path')
    .attr('d', timestamp =>
      lineGenerator([
        { timestamp, isBottom: false },
        { timestamp, isBottom: true }
      ])
    )
    .classed('grid-timestamp-line', true)
    .style('fill', 'none')
    .style('stroke', GRIDLINE_COLOR);

  // Render rectangle to delineate between historical data and projection data
  const historicalStartTimestamp = historicalTimeseries[0].timestamp;
  const historicalEndTimestamp = getTimestampAfterMonths(projectionStartTimestamp, -monthsPerTimestep);
  groupElement
    .append('rect')
    .attr('y', offsetFromTop)
    .attr('x', xScale(historicalStartTimestamp))
    .attr('height', bottomYValue - offsetFromTop)
    .attr(
      'width',
      xScale(historicalEndTimestamp) - xScale(historicalStartTimestamp)
    )
    .attr('stroke', 'none')
    .attr('fill', historicalDataUncertaintyColor(historicalTimeseries, projectionStartTimestamp, timeScale));

  // Render major ticks
  // "Now" is one timestep before projection start
  const nowTimestamp = getTimestampAfterMonths(
    projectionStartTimestamp,
    -1 * monthsPerTimestep
  );
  const timeSlices = getTimeScaleOption(timeScale).timeSlices;
  const timeSliceTimestamps = timeSlices.map(({ months }) => {
    return getTimestampAfterMonths(nowTimestamp, months);
  });
  const majorTickTimestamps = [nowTimestamp, ...timeSliceTimestamps];
  const timeSliceLabels = getTimeScaleOption(timeScale).timeSlices.map(
    timeslice => timeslice.label
  );
  const majorTickLabels = ['now', ...timeSliceLabels];
  groupElement
    .selectAll('.grid-timeslice-line')
    .data(majorTickTimestamps)
    .join('path')
    .attr('d', timestamp =>
      lineGenerator([
        { timestamp, isBottom: false },
        { timestamp, isBottom: true }
      ])
    )
    .classed('grid-timeslice-line', true)
    .style('fill', 'none')
    .style('stroke', MAJOR_TICK_COLOR);
  groupElement
    .selectAll('.major-tick-label')
    .data(majorTickTimestamps)
    .join('text')
    .classed('major-tick-label', true)
    .attr('x', (d) => xScale(d))
    .attr('y', offsetFromTop + MAJOR_TICK_LABEL_SIZE)
    .style('text-anchor', 'start')
    .style('font-size', MAJOR_TICK_LABEL_SIZE)
    .style('fill', 'gray')
    .text((d, i) => majorTickLabels[i]);

  // render scrollbar data range labels
  const scrollbarLabelYOffset = 10;
  const scrollbarLabelXOffset = 5;
  const projectionEnd = _.max(stepTimestamps) ?? 0;
  scrollbarGroupElement.select('.scrollbar-range-start').remove();
  scrollbarGroupElement.select('.scrollbar-range-end').remove();
  scrollbarGroupElement
    .append('text')
    .classed('scrollbar-range-start', true)
    .attr('x', Y_AXIS_WIDTH + scrollbarLabelXOffset)
    .attr('y', scrollbarLabelYOffset)
    .style('text-anchor', 'start')
    .style('font-size', 'x-small')
    .style('fill', 'gray')
    .text(DATE_FORMATTER(historicalStartTimestamp));
  scrollbarGroupElement
    .append('text')
    .classed('scrollbar-range-end', true)
    .attr('x', totalWidth - Y_AXIS_WIDTH - scrollbarLabelXOffset)
    .attr('y', scrollbarLabelYOffset)
    .style('text-anchor', 'end')
    .style('font-size', 'x-small')
    .style('fill', 'gray')
    .text(DATE_FORMATTER(projectionEnd));
};

const renderHistoricalTimeseries = (
  historicalTimeseries: TimeseriesPoint[],
  parentGroupElement: D3GElementSelection,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
) => {
  renderLine(
    parentGroupElement,
    historicalTimeseries,
    xScale,
    yScale,
    HISTORICAL_DATA_COLOR
  );
};

const renderProjectionRidgelines = (
  parentGroupElement: D3GElementSelection,
  projections: ScenarioProjection[],
  selectedScenarioId: string,
  minValue: number,
  maxValue: number,
  historicalTimeseries: TimeseriesPoint[],
  timeScale: TimeScale,
  offsetFromTop: number,
  projectionStartTimestamp: number,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
) => {
  const ridgeLineGroup = parentGroupElement.append('g');
  const currentProjection = projections.find(p => p.scenarioId === selectedScenarioId);

  if (!currentProjection) {
    console.error(`Unable to find selected scenario ${selectedScenarioId}`);
    return;
  }

  const ridgeLines = convertDistributionTimeseriesToRidgelines(
    currentProjection.values,
    timeScale,
    minValue,
    maxValue,
    false
  );

  // Make width proportional to 60% of a step size
  let approximateWidth = 15;
  if (currentProjection.values.length > 1) {
    const vals = currentProjection.values;
    approximateWidth = 0.6 * (xScale(vals[1].timestamp) - xScale(vals[0].timestamp));
  }

  // Render each ridgeline
  ridgeLines.forEach(ridgelineWithMetadata => {
    const { timestamp, monthsAfterNow } = ridgelineWithMetadata;
    const contextRange = calculateTypicalChangeBracket(
      historicalTimeseries,
      monthsAfterNow,
      projectionStartTimestamp
    );
    const elem = renderRidgelines(
      ridgeLineGroup as any,
      ridgelineWithMetadata,
      null,
      approximateWidth,
      Math.abs(yScale.range()[1] - yScale.range()[0]),
      minValue,
      maxValue,
      false,
      false,
      '',
      contextRange
    );
    elem.attr('transform', translate(xScale(timestamp), offsetFromTop));
  });
};

const renderConstraints = (
  parentGroupElement: D3GElementSelection,
  historicalTimeseries: TimeseriesPoint[],
  constraints: ProjectionConstraint[],
  projectionStartTimestamp: number,
  timeScale: TimeScale,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
) => {
  // Map historical timeseries and projection constraints to the same format
  const circles = [
    ...historicalTimeseries.map(({ timestamp, value }) => ({
      cx: xScale(timestamp),
      cy: yScale(value),
      color: HISTORICAL_DATA_COLOR
    })),
    ...constraints.map(({ step, value }) => {
      const monthsPerTimestep = getMonthsPerTimestepFromTimeScale(timeScale);
      const constraintTimestamp = getTimestampAfterMonths(projectionStartTimestamp, monthsPerTimestep * step);
      return {
        cx: xScale(constraintTimestamp),
        cy: yScale(value),
        color: SELECTED_COLOR
      };
    })
  ];
  // Render circles
  parentGroupElement
    .selectAll('.constraint')
    .data(circles)
    .enter()
    .append('circle')
    .classed('constraint', true)
    .attr('cx', ({ cx }) => cx)
    .attr('cy', ({ cy }) => cy)
    .style('stroke', ({ color }) => color)
    .style('stroke-width', 2)
    .style('pointer-events', 'none')
    .style('fill', 'white')
    .attr('r', CONSTRAINT_RADIUS);
};

const generateClickableAreas = (
  parentGroupElement: D3GElementSelection,
  xScale: D3ScaleLinear,
  yScale: D3ScaleLinear,
  historicalTimeseries: TimeseriesPoint[],
  constraints: ProjectionConstraint[],
  unit: string,
  projectionStartTimestamp: number,
  projectionStepCount: number,
  timeScale: TimeScale,
  setConstraints: (newConstraints: ProjectionConstraint[]) => void,
  setHistoricalTimeseries: (newPoints: TimeseriesPoint[]) => void
) => {
  const startTimestamp = historicalTimeseries[0].timestamp;
  const monthsPerTimestep = getMonthsPerTimestepFromTimeScale(timeScale);
  const stepsInProjection = getStepCountFromTimeScale(timeScale);
  const monthsInProjection = (stepsInProjection - 1) * monthsPerTimestep;
  const projectionLastTimestamp = getTimestampAfterMonths(
    projectionStartTimestamp,
    monthsInProjection
  );
  const timelineRectWidth = xScale(projectionLastTimestamp) - xScale(startTimestamp);
  const timelineRectHeight = yScale.range()[0] - yScale.range()[1];
  const timelineRect = parentGroupElement
    .append('rect')
    .classed('projection-rect', true)
    .attr('x', xScale(startTimestamp))
    .attr('y', PADDING_TOP)
    .attr('height', timelineRectHeight)
    .attr('width', timelineRectWidth)
    // Fill can't be 'none' otherwise no pointer events will be detected.
    //  So set its opacity to 0.
    .attr('fill', '#fff0')
    .attr('stroke', 'none')
    .attr('cursor', 'pointer');

  // IMPORTANT: projectionRect specifically refers to the area from the first
  //  projected timestep to the last.
  const projectionRectWidth =
    xScale(projectionLastTimestamp) - xScale(projectionStartTimestamp);
  // Subtract one from step and y position count because half a clickable area is outside
  //  of the projection area on the left and on the right
  const spaceBetweenSteps = projectionRectWidth / (projectionStepCount - 1);
  const spaceBetweenDiscreteYValues =
    timelineRectHeight / (DISCRETE_Y_POSITION_COUNT - 1);
  // FIXME: we should use chartValueFormatter here but it's currently a little wonky,
  // showing far too many digits
  const valueFormatter = (v: number) => v.toPrecision(3);
  timelineRect.on('mousemove', function(event: MouseEvent) {
    const { step, yPositionIndex } = getDiscreteIndicesFromMouseEvent(
      event,
      PADDING_TOP,
      timelineRectHeight,
      projectionStepCount,
      xScale,
      projectionStartTimestamp,
      timeScale
    );
    const monthsPerTimestep = getMonthsPerTimestepFromTimeScale(timeScale);
    const discreteTimestamp = getTimestampAfterMonths(projectionStartTimestamp, monthsPerTimestep * step);
    const discreteXPosition = xScale(discreteTimestamp);
    const discreteYPosition =
      PADDING_TOP + yPositionIndex * spaceBetweenDiscreteYValues;
    parentGroupElement.select('.constraint-selector').remove();
    parentGroupElement.select('.constraint-selector-support-line').remove();
    parentGroupElement
      .append('circle')
      .classed('constraint-selector', true)
      .attr('cx', discreteXPosition)
      .attr('cy', discreteYPosition)
      .attr('r', CONSTRAINT_HOVER_RADIUS)
      .style('pointer-events', 'none')
      .style('fill', 'none')
      .style('stroke', SELECTED_COLOR);
    parentGroupElement
      .append('line')
      .classed('constraint-selector-support-line', true)
      .attr('x1', Y_AXIS_WIDTH)
      .attr('y1', discreteYPosition)
      .attr('x2', discreteXPosition)
      .attr('y2', discreteYPosition)
      .style('pointer-events', 'none')
      .style('stroke-dasharray', ('3, 3'))
      .style('stroke', SELECTED_COLOR);

    const value = yScale.invert(discreteYPosition);
    const timestamp = roundToNearestMonth(xScale.invert(discreteXPosition));
    showSvgTooltip(
      parentGroupElement,
      `${DATE_FORMATTER(timestamp)}: ${valueFormatter(value)} ${unit}`,
      [discreteXPosition, discreteYPosition],
      0,
      true
    );
  });
  timelineRect.on('mouseleave', function() {
    parentGroupElement.select('.constraint-selector').remove();
    parentGroupElement.select('.constraint-selector-support-line').remove();
    hideSvgTooltip(parentGroupElement);
  });
  timelineRect.on('click', function(event) {
    const { step, yPositionIndex } = getDiscreteIndicesFromMouseEvent(
      event,
      PADDING_TOP,
      timelineRectHeight,
      projectionStepCount,
      xScale,
      projectionStartTimestamp,
      timeScale
    );
    const value = yScale.invert(
      PADDING_TOP + yPositionIndex * spaceBetweenDiscreteYValues
    );
    if (step < 0) {
      // Modify historical timeseries
      const discreteXPosition =
        xScale(projectionStartTimestamp) + step * spaceBetweenSteps;
      const timestamp = roundToNearestMonth(xScale.invert(discreteXPosition));
      const existingPoint = historicalTimeseries.find(
        point => point.timestamp === timestamp
      );
      const otherPoints = historicalTimeseries.filter(
        point => point.timestamp !== timestamp
      );
      // If constraint exists at this timestamp and value, remove it
      if (existingPoint?.value === value) {
        setHistoricalTimeseries(otherPoints);
        return;
      }
      // Else, add a new constraint at this timestamp and value,
      //  replacing any existing constraint at this step
      const newPoints = [...otherPoints, { timestamp, value }];
      newPoints.sort((a, b) => a.timestamp - b.timestamp);
      setHistoricalTimeseries(newPoints);
      return;
    }
    // Otherwise, modify projection constraints
    const existingConstraint = constraints.find(
      constraint => constraint.step === step
    );
    const otherConstraints = constraints.filter(
      constraint => constraint.step !== step
    );
    // If constraint exists at this step and value, remove it
    if (existingConstraint?.value === value) {
      setConstraints(otherConstraints);
      return;
    }
    // Else, add a new constraint at this step and value, replacing any existing constraint
    //  at this step
    setConstraints([...otherConstraints, { step, value }]);
  });
};

const getDiscreteIndicesFromMouseEvent = (
  event: MouseEvent,
  timelineRectY: number,
  timelineRectHeight: number,
  projectionStepCount: number,
  xScale: D3ScaleLinear,
  projectionStartTimestamp: number,
  timeScale: TimeScale
) => {
  const [pointerX, pointerY] = d3.pointer(event);
  const timestampAtMouse = xScale.invert(pointerX);
  // Start at last projection step and travel backwards until distanceFromMouse starts increasing
  const monthsPerTimestep = getMonthsPerTimestepFromTimeScale(timeScale);
  let distanceFromLastStep = Number.POSITIVE_INFINITY;
  let closestStepIndex = projectionStepCount;
  let isGettingCloser = true;
  while (isGettingCloser) {
    // Check next step
    const timestampAtStep = getTimestampAfterMonths(
      projectionStartTimestamp,
      (closestStepIndex - 1) * monthsPerTimestep
    );
    const distanceFromMouse = Math.abs(timestampAtMouse - timestampAtStep);
    if (distanceFromMouse > distanceFromLastStep) {
      isGettingCloser = false;
    } else {
      distanceFromLastStep = distanceFromMouse;
      closestStepIndex -= 1;
    }
  }
  // Subtract 1 from Y position count to get indices from 0 to
  //  position count - 1
  const yPositionIndex = Math.round(
    ((pointerY - timelineRectY) / timelineRectHeight) *
      (DISCRETE_Y_POSITION_COUNT - 1)
  );
  return {
    step: closestStepIndex,
    yPositionIndex
  };
};
