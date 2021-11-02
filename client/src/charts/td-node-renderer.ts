import _ from 'lodash';
import moment from 'moment';
import dateFormatter from '@/formatters/date-formatter';
import { ProjectionConstraint, ScenarioProjection } from '@/types/CAG';
import { D3GElementSelection, D3ScaleLinear, D3Selection } from '@/types/D3';
import { TimeseriesPoint } from '@/types/Timeseries';
import { chartValueFormatter } from '@/utils/string-util';
import { calculateGenericTicks, calculateYearlyTicks, renderLine, renderXaxis, renderYaxis } from '@/utils/timeseries-util';
import * as d3 from 'd3';
import {
  confidenceArea,
  hideSvgTooltip,
  showSvgTooltip,
  translate
} from '@/utils/svg-util';
import { SELECTED_COLOR, SELECTED_COLOR_DARK } from '@/utils/colors-util';
import { roundToNearestMonth } from '@/utils/date-util';

const HISTORICAL_DATA_COLOR = '#888';
const HISTORICAL_RANGE_OPACITY = 0.025;
const CONTEXT_RANGE_FILL = SELECTED_COLOR;
const CONTEXT_RANGE_STROKE = SELECTED_COLOR_DARK;
const CONTEXT_RANGE_OPACITY = 0.4;
const CONTEXT_TIMESERIES_OPACITY = 0.2;
const GRIDLINE_COLOR = '#eee';

const X_AXIS_HEIGHT = 20;
const Y_AXIS_WIDTH = 40;
const PADDING_TOP = 10;
const PADDING_RIGHT = 40;

const CONFIDENCE_BAND_OPACITY = 0.2;
const CONSTRAINT_RADIUS = 4;
const CONSTRAINT_HOVER_RADIUS = CONSTRAINT_RADIUS * 1.5;

/** How many positions on the Y axis the user's mouse position will
  be snapped to. */
const DISCRETE_Y_POSITION_COUNT = 31;

const DATE_FORMATTER = (value: any) => dateFormatter(value, 'YYYY');

export default function(
  selection: D3Selection,
  totalWidth: number,
  totalHeight: number,
  historicalTimeseries: TimeseriesPoint[],
  projections: ScenarioProjection[],
  selectedScenarioId: string,
  constraints: ProjectionConstraint[],
  minValue: number,
  maxValue: number,
  viewingExtent: number[] | null,
  setConstraints: (newConstraints: ProjectionConstraint[]) => void,
  setHistoricalTimeseries: (newPoints: TimeseriesPoint[]) => void
) {
  // FIXME: Tie data to group element, should make renderer stateful instead of a single function
  let oldCoords: number[] = [];
  const oldG = selection.select('.contextGroupElement');
  if (oldG.size() === 1 && !_.isEmpty(oldG.datum())) {
    oldCoords = oldG.datum();
  }
  selection.selectAll('*').remove();

  if (projections.length === 0) return;
  const [xExtent, yExtent] = calculateExtents(
    historicalTimeseries,
    projections,
    minValue,
    maxValue
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
  const focusHeight = totalHeight * 0.75;
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

  // Build "context" chart for zooming and panning
  const contextHeight = totalHeight - focusHeight;
  const [xScaleContext, yScaleContext] = calculateScales(
    totalWidth - PADDING_RIGHT,
    contextHeight - X_AXIS_HEIGHT,
    0,
    Y_AXIS_WIDTH,
    xExtent,
    yExtent
  );
  const contextGroupElement = selection
    .append('g')
    .classed('contextGroupElement', true);

  const firstTimestamp = xScaleContext.domain()[0]; // potentially misleading as this isnt always the first day of the year
  const lastTimestamp = moment([moment(xScaleContext.domain()[1]).year()]).valueOf();

  const xAxisTicksContext = [firstTimestamp, lastTimestamp];
  const yAxisTicksContext = calculateGenericTicks(
    yScaleContext.domain()[0],
    yScaleContext.domain()[1]
  );

  const yOffset = contextHeight - X_AXIS_HEIGHT;
  const xOffset = totalWidth - PADDING_RIGHT;

  renderXaxis(
    contextGroupElement,
    xScaleContext,
    xAxisTicksContext,
    yOffset,
    DATE_FORMATTER
  );
  renderYaxis(
    contextGroupElement,
    yScaleContext,
    yAxisTicksContext,
    valueFormatter,
    xOffset,
    Y_AXIS_WIDTH
  );

  contextGroupElement.selectAll('.yAxis').remove();
  contextGroupElement.attr('transform', translate(0, focusHeight)); // move context to bottom
  renderStaticElements(
    contextGroupElement,
    xScaleContext,
    yScaleContext,
    0,
    projections,
    historicalTimeseries
  );

  // Render timeseries in the context chart, then fade them out
  renderHistoricalTimeseries(
    historicalTimeseries,
    contextGroupElement,
    xScaleContext,
    yScaleContext
  );
  renderProjections(
    projections,
    contextGroupElement,
    xScaleContext,
    yScaleContext,
    selectedScenarioId
  );
  contextGroupElement
    .selectAll('.segment-line')
    .attr('opacity', CONTEXT_TIMESERIES_OPACITY);

  // Create brush object and position over context axis
  const brush = d3
    .brushX()
    .extent([
      [xScaleContext.range()[0], yScaleContext.range()[1]],
      [xScaleContext.range()[1], yScaleContext.range()[0]]
    ])
    .on('start brush end', brushed);

  // Use viewingExtent to constrain focus if applicable
  if (oldCoords.length === 0 && viewingExtent !== null) {
    oldCoords.push(xScaleFocus(viewingExtent[0]));
    oldCoords.push(xScaleFocus(viewingExtent[1]));
  }

  contextGroupElement
    .append('g') // create brush element and move to default
    .classed('brush', true)
    .call(brush)
    // set initial brush selection to entire context
    .call(brush.move, oldCoords.length === 2 ? oldCoords : xScaleFocus.range());
  selection
    .selectAll('.brush > .selection')
    .attr('fill', CONTEXT_RANGE_FILL)
    .attr('stroke', CONTEXT_RANGE_STROKE)
    .attr('opacity', CONTEXT_RANGE_OPACITY);

  // Add clipping mask to hide elements that are outside the focus chart area when zoomed in
  selection
    .append('defs')
    .append('clipPath')
    .attr('id', 'clipping-mask')
    .append('rect')
    .attr('width', xScaleFocus.range()[1] - xScaleFocus.range()[0])
    .attr('height', yScaleFocus.range()[0] - yScaleFocus.range()[1])
    .attr('transform', translate(PADDING_RIGHT, PADDING_TOP));


  function brushHandle(g: D3GElementSelection, selection: number[]) {
    const enterFn = (enter: D3Selection) => {
      const handleW = 9;
      const handleWGap = -2;
      const handleHGap = 4;
      const handleH = contextHeight - X_AXIS_HEIGHT - 2 * handleHGap;

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
      [0.3, 0.4, 0.5, 0.6, 0.7].forEach(value => {
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
    contextGroupElement.datum(selection);
    contextGroupElement.select('.brush').call(brushHandle as any, selection);

    const [x0, x1] = selection.map(xScaleContext.invert);
    xScaleFocus.domain([x0, x1]);
    focusGroupElement.selectAll('*').remove();
    renderStaticElements(
      focusGroupElement,
      xScaleFocus,
      yScaleFocus,
      PADDING_TOP,
      projections,
      historicalTimeseries
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
    renderConstraints(
      focusGroupElement,
      historicalTimeseries,
      constraints,
      projections[0],
      xScaleFocus,
      yScaleFocus
    );
    renderProjections(
      projections,
      focusGroupElement,
      xScaleFocus,
      yScaleFocus,
      selectedScenarioId
    );
    generateClickableAreas(
      focusGroupElement,
      xScaleFocus,
      yScaleFocus,
      historicalTimeseries,
      projections,
      constraints,
      setConstraints,
      setHistoricalTimeseries
    );
    // Don't render anything outside the main graph area (except the axes)
    focusGroupElement
      .selectChildren('*:not(.xAxis):not(.yAxis)')
      .attr('clip-path', 'url(#clipping-mask)');
  }
}

const calculateExtents = (
  historicalTimeseries: TimeseriesPoint[],
  projections: ScenarioProjection[],
  minValue: number,
  maxValue: number
) => {
  const getTimestampFromPoint = (point: TimeseriesPoint) => point.timestamp;
  const projectedPoints = projections.flatMap(projection => projection.values);
  const projectedTimestamps = projectedPoints.map(getTimestampFromPoint);
  const xExtent = d3.extent([
    ...historicalTimeseries.map(getTimestampFromPoint),
    ...projectedTimestamps
  ]);
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
  xScale: D3ScaleLinear,
  yScale: D3ScaleLinear,
  offsetFromTop: number,
  projections: ScenarioProjection[],
  historicalTimeseries: TimeseriesPoint[]
) => {
  const stepTimestamps = projections[0].values.map(point => point.timestamp);
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
  const historicalEndTimestamp =
    historicalTimeseries[historicalTimeseries.length - 1].timestamp;
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
    .attr('fill', HISTORICAL_DATA_COLOR)
    .attr('fill-opacity', HISTORICAL_RANGE_OPACITY);
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

const renderConstraints = (
  parentGroupElement: D3GElementSelection,
  historicalTimeseries: TimeseriesPoint[],
  constraints: ProjectionConstraint[],
  arbitraryScenario: ScenarioProjection,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
) => {
  const { values } = arbitraryScenario;
  const projectionStartTimestamp = values[0].timestamp;
  const projectionRectWidth =
    xScale(values[values.length - 1].timestamp) -
    xScale(projectionStartTimestamp);
  const projectionStepCount = values.length;
  // Subtract one from step count because half a clickable area is outside
  //  of the projection rect on the left and the right
  const spaceBetweenSteps = projectionRectWidth / (projectionStepCount - 1);
  // Map historical timeseries and projection constraints to the same format
  const circles = [
    ...historicalTimeseries.map(({ timestamp, value }) => ({
      cx: xScale(timestamp),
      cy: yScale(value),
      color: HISTORICAL_DATA_COLOR
    })),
    ...constraints.map(({ step, value }) => ({
      cx: xScale(projectionStartTimestamp) + step * spaceBetweenSteps,
      cy: yScale(value),
      color: SELECTED_COLOR
    }))
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

const renderProjections = (
  projections: ScenarioProjection[],
  parentGroupElement: D3GElementSelection,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  selectedScenarioId: string
) => {
  const selectedScenario = projections.find(
    projection => projection.scenarioId === selectedScenarioId
  );
  // Render confidence interval
  if (selectedScenario !== undefined) {
    const { values, confidenceInterval } = selectedScenario;
    // FIXME: when svg-util is converted to TS, confidenceArea will know that it actually
    //  wants TimeseriesPoint[], not [number, number][].
    const valuesAsArray = (values as unknown) as [number, number][];
    const area =
      confidenceArea(xScale, yScale, { confidenceInterval })(valuesAsArray) ??
      '';
    parentGroupElement
      .append('path')
      .attr('class', 'confidence-band')
      .attr('d', area)
      .style('stroke', 'none')
      .style('fill-opacity', CONFIDENCE_BAND_OPACITY)
      .style('fill', SELECTED_COLOR)
      .style('pointer-events', 'none');
  }

  // Render each projection line
  projections.forEach(projection => {
    const color =
      projection.scenarioId === selectedScenarioId
        ? SELECTED_COLOR_DARK
        : 'grey';
    renderLine(parentGroupElement, projection.values, xScale, yScale, color);
  });
};

const generateClickableAreas = (
  parentGroupElement: D3GElementSelection,
  xScale: D3ScaleLinear,
  yScale: D3ScaleLinear,
  historicalTimeseries: TimeseriesPoint[],
  scenarios: ScenarioProjection[],
  constraints: ProjectionConstraint[],
  setConstraints: (newConstraints: ProjectionConstraint[]) => void,
  setHistoricalTimeseries: (newPoints: TimeseriesPoint[]) => void
) => {
  const startTimestamp = historicalTimeseries[0].timestamp;
  const endTimestamp =
    scenarios[0].values[scenarios[0].values.length - 1].timestamp;
  const timelineRectWidth = xScale(endTimestamp) - xScale(startTimestamp);
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

  const projectionStepCount = scenarios[0].values.length;
  const projectionStartTimestamp = scenarios[0].values[0].timestamp;
  // IMPORTANT: projectionRect specifically refers to the area from the first
  //  projected timestep to the last.
  const projectionRectWidth =
    xScale(endTimestamp) - xScale(projectionStartTimestamp);
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
      xScale(projectionStartTimestamp),
      PADDING_TOP,
      projectionRectWidth,
      timelineRectHeight,
      projectionStepCount
    );
    const discreteXPosition =
      xScale(projectionStartTimestamp) + step * spaceBetweenSteps;
    const discreteYPosition =
      PADDING_TOP + yPositionIndex * spaceBetweenDiscreteYValues;
    parentGroupElement.select('.constraint-selector').remove();
    parentGroupElement
      .append('circle')
      .classed('constraint-selector', true)
      .attr('cx', discreteXPosition)
      .attr('cy', discreteYPosition)
      .attr('r', CONSTRAINT_HOVER_RADIUS)
      .style('pointer-events', 'none')
      .style('fill', 'none')
      .style('stroke', SELECTED_COLOR);

    const value = yScale.invert(discreteYPosition);
    const timestamp = roundToNearestMonth(xScale.invert(discreteXPosition));
    const tooltipRows = [
      `${DATE_FORMATTER(timestamp)}: ${valueFormatter(value)}\n`
    ];
    scenarios.forEach(scenario => {
      const point = scenario.values.find(
        point => roundToNearestMonth(point.timestamp) === timestamp
      );
      if (point !== undefined) {
        tooltipRows.push(
          `${scenario.scenarioName}: ${valueFormatter(point.value)}`
        );
      }
    });
    showSvgTooltip(
      parentGroupElement,
      tooltipRows.join('\n'),
      [discreteXPosition, discreteYPosition],
      0,
      true
    );
  });
  timelineRect.on('mouseleave', function() {
    parentGroupElement.select('.constraint-selector').remove();
    hideSvgTooltip(parentGroupElement);
  });
  timelineRect.on('click', function(event) {
    const { step, yPositionIndex } = getDiscreteIndicesFromMouseEvent(
      event,
      xScale(projectionStartTimestamp),
      PADDING_TOP,
      projectionRectWidth,
      timelineRectHeight,
      projectionStepCount
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
  projectionRectX: number,
  timelineRectY: number,
  projectionRectWidth: number,
  timelineRectHeight: number,
  projectionStepCount: number
) => {
  const [pointerX, pointerY] = d3.pointer(event);
  // Subtract 1 from projectionStepCount and Y position count to get indices from 0 to
  // (step count or position count) - 1
  const step = Math.round(
    ((pointerX - projectionRectX) / projectionRectWidth) *
      (projectionStepCount - 1)
  );
  const yPositionIndex = Math.round(
    ((pointerY - timelineRectY) / timelineRectHeight) *
      (DISCRETE_Y_POSITION_COUNT - 1)
  );
  return {
    step,
    yPositionIndex
  };
};
