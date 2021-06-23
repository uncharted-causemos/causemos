import * as d3 from 'd3';
import _ from 'lodash';
import { translate } from '@/utils/svg-util';
import { SELECTED_COLOR, SELECTED_COLOR_DARK } from '@/utils/colors-util';
import { chartValueFormatter } from '@/utils/string-util';
import dateFormatter from '@/formatters/date-formatter';
import { Timeseries, TimeseriesPoint } from '@/types/Timeseries';
import { D3Selection, D3GElementSelection } from '@/types/D3';
import { TemporalAggregationLevel } from '@/types/Enums';

const X_AXIS_HEIGHT = 20;
const Y_AXIS_WIDTH = 40;
const PADDING_TOP = 10;
const PADDING_RIGHT = 40;

const X_AXIS_TICK_COUNT = 4;
const Y_AXIS_TICK_COUNT = 2;
const X_AXIS_TICK_SIZE_PX = 2;
// The type of value can't be more specific than `any`
//  because under the hood d3.tickFormat requires d3.NumberType.
// It correctly converts, but its TypeScript definitions don't
//  seem to reflect that.
// FIXME: we need to decide whether we want our timestamps to be stored in millis or seconds
//  and be consistent.
const DATE_FORMATTER = (value: any) =>
  dateFormatter(value * 1000, 'MMM DD, YYYY');
const BY_YEAR_DATE_FORMATTER = (value: any) =>
  dateFormatter(new Date(0, value), 'MMM');

const DEFAULT_LINE_COLOR = '#000';
const LABEL_BACKGROUND_COLOR = 'white';
const LABEL_FONT_SIZE = '12px';
const DASHED_LINE = {
  length: 4,
  gap: 2,
  opacity: 0.5
};

const SELECTED_TIMESTAMP_WIDTH = 2;
const SELECTABLE_TIMESTAMP_OPACITY = 0.5;

// A collection of elements that are used to dynamically show details about the selected
//  timestamp
// - selectedTimestampGroup: the vertical line and label to show the timestamp itself
// - valueGroups: an array of horizontal dashed lines and labels to show the value of
//    each timeseries at the selected timestamp. One group of elements for each timeseries.
interface TimestampElements {
  selectedTimestampGroup: D3GElementSelection;
  valueGroups: D3GElementSelection[];
}

export default function(
  selection: D3Selection,
  timeseriesList: Timeseries[],
  width: number,
  height: number,
  selectedTimestamp: number,
  onTimestampSelected: (timestamp: number) => void,
  breakdownOption: string | null
) {
  const groupElement = selection.append('g');
  const [xExtent, yExtent] = calculateExtents(timeseriesList);
  if (xExtent[0] === undefined || yExtent[0] === undefined) {
    console.error('Unable to derive extent from data', timeseriesList);
    // This function must always return a function to call when
    //  the selected timestamp is changed by a component higher
    //  up the hierarchy.
    return () => {};
  }

  const valueFormatter = chartValueFormatter(...yExtent);
  const [xScale, yScale] = calculateScales(
    width,
    height,
    xExtent,
    yExtent,
    breakdownOption
  );
  const timestampFormatter =
    breakdownOption === TemporalAggregationLevel.Year
      ? BY_YEAR_DATE_FORMATTER
      : DATE_FORMATTER;
  renderAxes(
    groupElement,
    xScale,
    yScale,
    valueFormatter,
    width,
    height,
    timestampFormatter
  );
  timeseriesList.forEach(timeSeries => {
    renderLine(groupElement, timeSeries, xScale, yScale);
  });

  generateSelectableTimestamps(
    groupElement,
    timeseriesList,
    xScale,
    height,
    onTimestampSelected
  );

  const timestampElements = generateSelectedTimestampElements(
    groupElement,
    height,
    width,
    timeseriesList
  );

  // Set timestamp elements to reflect the initially selected
  //  timestamp
  updateTimestampElements(
    selectedTimestamp,
    timestampElements,
    timeseriesList,
    xScale,
    yScale,
    valueFormatter,
    timestampFormatter
  );
  // Return function to update the timestamp elements when
  //  a parent component selects a different timestamp
  return (timestamp: number | null) => {
    updateTimestampElements(
      timestamp,
      timestampElements,
      timeseriesList,
      xScale,
      yScale,
      valueFormatter,
      timestampFormatter
    );
  };
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
  yExtent: [number, number],
  breakdownOption: string | null
) {
  const xScaleDomain =
    breakdownOption === TemporalAggregationLevel.Year
      ? [0, 11] // January === 0, December === 11
      : xExtent;
  const xScale = d3
    .scaleLinear()
    .domain(xScaleDomain)
    .range([Y_AXIS_WIDTH, width - PADDING_RIGHT]);
  const yScale = d3
    .scaleLinear()
    .domain(yExtent)
    .range([height - X_AXIS_HEIGHT, PADDING_TOP]);
  return [xScale, yScale];
}

function renderLine(
  parentGroupElement: D3GElementSelection,
  timeseries: Timeseries,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
) {
  // Draw a line connecting all points in this segment
  const line = d3
    .line<TimeseriesPoint>()
    .x(d => xScale(d.timestamp))
    .y(d => yScale(d.value));
  const groupElement = parentGroupElement.append('g');
  groupElement
    .append('path')
    .classed('segment-line', true)
    .attr('d', () => line(timeseries.points))
    .style('fill', 'none')
    .style('stroke', timeseries.color || DEFAULT_LINE_COLOR);
}

function renderAxes(
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
  timestampFormatter: (timestamp: any) => string
) {
  const xAxis = d3
    .axisBottom(xScale)
    .tickSize(X_AXIS_TICK_SIZE_PX)
    .tickFormat(timestampFormatter)
    .ticks(X_AXIS_TICK_COUNT);
  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(width - Y_AXIS_WIDTH - PADDING_RIGHT)
    .tickFormat(valueFormatter)
    .ticks(Y_AXIS_TICK_COUNT);
  selection
    .append('g')
    .classed('xAxis', true)
    .style('pointer-events', 'none')
    .call(xAxis)
    .style('font-size', '10px')
    .attr('transform', translate(0, height - X_AXIS_HEIGHT));
  selection
    .append('g')
    .classed('yAxis', true)
    .style('pointer-events', 'none')
    .call(yAxis)
    .style('font-size', '10px')
    .attr('transform', translate(width - PADDING_RIGHT, 0));
}

function generateSelectableTimestamps(
  selection: D3GElementSelection,
  timeseriesList: Timeseries[],
  xScale: d3.ScaleLinear<number, number>,
  height: number,
  onTimestampSelected: (timestamp: number) => void
) {
  const timestampGroup = selection.append('g');
  const allTimestamps = timeseriesList
    .map(timeSeries => timeSeries.points)
    .flat()
    .map(point => point.timestamp);
  const uniqueTimestamps = _.uniq(allTimestamps);
  // FIXME: We assume that all timestamps are evenly spaced when determining
  //  how wide the hover/click hitbox should be. This may not always be the case.

  // Arbitrarily choose how wide the hitbox should be if there's only one unique
  //  timestamp
  const hitboxWidth =
    uniqueTimestamps.length > 1
      ? xScale(uniqueTimestamps[1]) - xScale(uniqueTimestamps[0])
      : SELECTED_TIMESTAMP_WIDTH * 5;
  uniqueTimestamps.forEach(timestamp => {
    const timestampMarker = timestampGroup
      .append('rect')
      .attr('width', SELECTED_TIMESTAMP_WIDTH)
      .attr('height', height - PADDING_TOP - X_AXIS_HEIGHT)
      .attr(
        'transform',
        translate(xScale(timestamp) - SELECTED_TIMESTAMP_WIDTH / 2, PADDING_TOP)
      )
      .attr('fill', SELECTED_COLOR)
      .attr('fill-opacity', SELECTABLE_TIMESTAMP_OPACITY)
      .attr('visibility', 'hidden');
    // Hover hitbox
    timestampGroup
      .append('rect')
      .attr('width', hitboxWidth)
      .attr('height', height - PADDING_TOP - X_AXIS_HEIGHT)
      .attr(
        'transform',
        translate(xScale(timestamp) - hitboxWidth / 2, PADDING_TOP)
      )
      .attr('fill-opacity', 0)
      .style('cursor', 'pointer')
      .on('mouseenter', () => timestampMarker.attr('visibility', 'visible'))
      .on('mouseleave', () => timestampMarker.attr('visibility', 'hidden'))
      .on('mousedown', () => onTimestampSelected(timestamp));
  });
}

function calculateLabelDimensions(
  labelText: d3.Selection<SVGTextElement, any, null, any>
) {
  const textBBox = labelText.node()?.getBBox() ?? { width: 0, height: 0 };
  return {
    labelWidth: textBBox.width,
    labelHeight: textBBox.height
  };
}

function generateLabel(
  parentElement: D3GElementSelection,
  color: string,
  text: string
) {
  const labelGroup = parentElement.append('g');
  // Label to display the timestamp
  const labelText = labelGroup
    .append('text')
    .style('fill', color)
    .style('text-anchor', 'middle')
    .style('font-size', LABEL_FONT_SIZE)
    .text(text);
  const { labelWidth, labelHeight } = calculateLabelDimensions(labelText);
  labelText.attr(
    'transform',
    // Nudge upwards to accomodate for the weird text bounding box sizing
    translate(0, labelHeight - 3)
  );
  // Background for the label
  labelGroup
    .append('rect')
    .classed('label-background', true)
    .attr('width', labelWidth)
    .attr('height', labelHeight)
    .attr('transform', translate(-labelWidth / 2, 0))
    .style('fill', LABEL_BACKGROUND_COLOR);
  // Move text on top of background
  labelText.raise();
  return labelGroup;
}

function generateSelectedTimestampElements(
  selection: D3GElementSelection,
  height: number,
  width: number,
  timeseriesList: Timeseries[]
) {
  const selectedTimestampGroup = selection
    .append('g')
    .attr('visibility', 'hidden');
  const selectedTimestampHeight = height - X_AXIS_HEIGHT - PADDING_TOP;

  // Vertical line
  selectedTimestampGroup
    .append('rect')
    .attr('width', SELECTED_TIMESTAMP_WIDTH)
    .attr('height', selectedTimestampHeight)
    .attr('transform', translate(-(SELECTED_TIMESTAMP_WIDTH / 2), 0))
    .style('fill', SELECTED_COLOR_DARK);

  generateLabel(
    selectedTimestampGroup,
    SELECTED_COLOR_DARK,
    '[selected timestamp]'
  ).attr('transform', translate(0, selectedTimestampHeight));

  // For each timeseries, add a dotted line and label
  const valueGroups = timeseriesList.map(timeseries => {
    const gElement = selection
      .append('g')
      .attr('visibility', 'hidden')
      .attr('transform', translate(width - PADDING_RIGHT, PADDING_TOP));
    const color = timeseries.color ?? DEFAULT_LINE_COLOR;
    gElement
      .append('line')
      .attr('stroke', color)
      .attr('stroke-dasharray', `${DASHED_LINE.length},${DASHED_LINE.gap}`)
      .attr('stroke-opacity', DASHED_LINE.opacity)
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', 0);
    const label = generateLabel(gElement, color, '[value]');
    const height = label.node()?.getBBox().height ?? 0;
    label.attr(
      'transform',
      translate(SELECTED_TIMESTAMP_WIDTH / 2, -height / 2)
    );
    label.select('text').style('text-anchor', 'start');
    label.select('rect').attr('transform', translate(0, 0));
    return gElement;
  });
  return { selectedTimestampGroup, valueGroups };
}

function updateTimestampElements(
  timestamp: number | null,
  { selectedTimestampGroup, valueGroups }: TimestampElements,
  timeseriesList: Timeseries[],
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  valueFormatter: (value: any) => string,
  timestampFormatter: (timestamp: number) => string
) {
  if (timestamp === null) {
    // Hide everything
    selectedTimestampGroup.attr('visibility', 'hidden');
    valueGroups.forEach(valueGroup => valueGroup.attr('visibility', 'hidden'));
    return;
  }
  // Move selectedTimestamp elements horizontally to the right position
  const selectedXPosition = xScale(timestamp);
  selectedTimestampGroup
    .attr('visibility', 'visible')
    .attr('transform', translate(selectedXPosition, PADDING_TOP));
  // Display the newly selected timestamp
  const labelText = selectedTimestampGroup
    .select<SVGTextElement>('text')
    .text(timestampFormatter(timestamp));
  // Resize background to match
  const { labelWidth } = calculateLabelDimensions(labelText);
  selectedTimestampGroup
    .select('.label-background')
    .attr('width', labelWidth)
    .attr('transform', translate(-labelWidth / 2, 0));

  valueGroups.forEach((valueGroup, index) => {
    valueGroup.attr('visibility', 'visible');
    // Adjust the length and vertical position of each dashed line
    const timeseries = timeseriesList[index];
    const point = timeseries.points.find(
      point => point.timestamp === timestamp
    );
    if (point === undefined) {
      // This line doesn't have a value at the selected timestamp,
      // so hide it and move on
      valueGroup.attr('visibility', 'hidden');
      return;
    }
    const yPosition = yScale(point.value);
    const rightEdge = xScale.range()[1];
    valueGroup
      .attr('transform', translate(rightEdge, yPosition))
      .select<SVGLineElement>('line')
      .attr('x2', -(rightEdge - selectedXPosition));
    // Display the run's value at this timestamp
    const labelText = valueGroup
      .select<SVGTextElement>('text')
      .text(valueFormatter(point.value));
    // Resize background to match
    const { labelWidth } = calculateLabelDimensions(labelText);
    valueGroup.select('.label-background').attr('width', labelWidth);
  });
}
