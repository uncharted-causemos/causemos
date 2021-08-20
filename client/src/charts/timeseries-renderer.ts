import * as d3 from 'd3';
import _ from 'lodash';
import { translate } from '@/utils/svg-util';
import { SELECTED_COLOR, SELECTED_COLOR_DARK } from '@/utils/colors-util';
import { chartValueFormatter } from '@/utils/string-util';
import dateFormatter from '@/formatters/date-formatter';
import { Timeseries } from '@/types/Timeseries';
import { D3Selection, D3GElementSelection } from '@/types/D3';
import { TemporalAggregationLevel } from '@/types/Enums';
import { renderAxes, renderLine, renderPoint } from '@/utils/timeseries-util';

const X_AXIS_HEIGHT = 20;
const Y_AXIS_WIDTH = 40;
const PADDING_TOP = 10;
const PADDING_RIGHT = 5;

// The type of value can't be more specific than `any`
//  because under the hood d3.tickFormat requires d3.NumberType.
// It correctly converts, but its TypeScript definitions don't
//  seem to reflect that.

const DATE_FORMATTER = (value: any) =>
  dateFormatter(value, 'MMM DD, YYYY');
const BY_YEAR_DATE_FORMATTER = (value: any) =>
  dateFormatter(new Date(0, value), 'MMM');

const DASHED_LINE = {
  length: 4,
  gap: 2,
  opacity: 0.5
};

const SELECTED_TIMESTAMP_WIDTH = 1;
const SELECTABLE_TIMESTAMP_OPACITY = 0.5;

export default function(
  selection: D3Selection,
  timeseriesList: Timeseries[],
  width: number,
  height: number,
  selectedTimestamp: number,
  onTimestampSelected: (timestamp: number) => void,
  breakdownOption: string | null,
  selectedTimestampRange: {start: number; end: number} | null
) {
  const groupElement = selection.append('g');
  const [xExtent, yExtent] = calculateExtents(timeseriesList, selectedTimestampRange);
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
    timestampFormatter,
    Y_AXIS_WIDTH,
    PADDING_RIGHT,
    X_AXIS_HEIGHT
  );
  timeseriesList.forEach(timeseries => {
    if (timeseries.points.length > 1) { // draw a line for time series longer than 1
      renderLine(groupElement, timeseries.points, xScale, yScale, timeseries.color);
      // also, draw dots for all the timeseries points
      renderPoint(groupElement, timeseries.points, xScale, yScale, timeseries.color);
    } else { // draw a spot for timeseries that are only 1 long
      renderPoint(groupElement, timeseries.points, xScale, yScale, timeseries.color);
    }
  });

  generateSelectableTimestamps(
    groupElement,
    timeseriesList,
    xScale,
    height,
    onTimestampSelected
  );

  const timestampLineElement = generateSelectedTimestampLine(
    groupElement,
    height
  );

  // Set timestamp elements to reflect the initially selected
  //  timestamp
  updateTimestampElements(
    selectedTimestamp,
    timestampLineElement,
    timeseriesList,
    xScale,
    selectedTimestampRange
  );
  // Return function to update the timestamp elements when
  //  a parent component selects a different timestamp
  return (timestamp: number | null) => {
    updateTimestampElements(
      timestamp,
      timestampLineElement,
      timeseriesList,
      xScale,
      selectedTimestampRange
    );
  };
}

function calculateExtents(timeseriesList: Timeseries[], selectedTimestampRange: {start: number; end: number} | null) {
  const allPoints = timeseriesList.map(timeSeries => timeSeries.points).flat();
  const allTimestampDataPoints = allPoints.map(point => point.timestamp);
  let xExtent: [number, number] | [undefined, undefined] = [undefined, undefined];
  if (selectedTimestampRange !== null) {
    // the user requested to render the timeseries chart within a specific range
    // so we should respect that and enlarge the extent to include the selectedTimestampRange, as needed
    //  this would enable the zooming effect
    xExtent = [selectedTimestampRange.start, selectedTimestampRange.end];
  } else {
    xExtent = d3.extent(allTimestampDataPoints);
  }

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
      .on('mousedown', () => onTimestampSelected(timestamp))
    ;
  });
}

function generateSelectedTimestampLine(
  selection: D3GElementSelection,
  height: number
) {
  const selectedTimestampGroup = selection
    .append('g')
    .attr('visibility', 'hidden');
  const selectedTimestampHeight = height - X_AXIS_HEIGHT - PADDING_TOP;

  selectedTimestampGroup
    .append('line')
    .attr('stroke', SELECTED_COLOR_DARK)
    .attr('stroke-width', SELECTED_TIMESTAMP_WIDTH)
    .attr('stroke-dasharray', `${DASHED_LINE.length},${DASHED_LINE.gap}`)
    .attr('stroke-opacity', DASHED_LINE.opacity)
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', 0)
    .attr('y2', selectedTimestampHeight);

  return selectedTimestampGroup;
}

function updateTimestampElements(
  timestamp: number | null,
  selectedTimestampGroup: D3GElementSelection,
  timeseriesList: Timeseries[],
  xScale: d3.ScaleLinear<number, number>,
  selectedTimestampRange: {start: number; end: number} | null
) {
  if (timestamp === null) {
    // Hide everything
    selectedTimestampGroup.attr('visibility', 'hidden');
    return;
  }
  // check if the selectedTimestamp is out of the timeseries range
  const [xExtent] = calculateExtents(timeseriesList, selectedTimestampRange);
  if (xExtent[0] === undefined || xExtent[1] === undefined) {
    console.error('Unable to derive extent from data', timeseriesList);
  } else {
    if (timestamp < xExtent[0] || timestamp > xExtent[1]) {
      // Hide everything
      selectedTimestampGroup.attr('visibility', 'hidden');
      return;
    }
  }

  // Move selectedTimestamp elements horizontally to the right position
  const selectedXPosition = xScale(timestamp);
  selectedTimestampGroup
    .attr('visibility', 'visible')
    .attr('transform', translate(selectedXPosition, PADDING_TOP));
}
