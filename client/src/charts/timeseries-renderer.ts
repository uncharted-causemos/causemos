import * as d3 from 'd3';
import { translate } from '@/utils/svg-util';
import { SELECTED_COLOR, SELECTED_COLOR_DARK } from '@/utils/colors-util';
import { chartValueFormatter } from '@/utils/string-util';
import { Timeseries } from '@/types/Timeseries';
import { D3Selection, D3GElementSelection } from '@/types/D3';
import { TemporalAggregationLevel, TemporalResolutionOption } from '@/types/Enums';
import { renderAxes, renderLine, renderPoint } from '@/utils/timeseries-util';

const X_AXIS_HEIGHT = 20;
const Y_AXIS_WIDTH = 40;
const PADDING_TOP = 10;
const PADDING_RIGHT = 5;

const TOOLTIP_BG_COLOUR = 'white';
const TOOLTIP_BORDER_COLOUR = 'grey';
const TOOLTIP_WIDTH = 150;
const TOOLTIP_BORDER_WIDTH = 1.5;
const TOOLTIP_FONT_SIZE = 10;
const TOOLTIP_PADDING = TOOLTIP_FONT_SIZE / 2;
const TOOLTIP_LINE_HEIGHT = TOOLTIP_FONT_SIZE + TOOLTIP_PADDING;

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
  selectedTimestampRange: {start: number; end: number} | null,
  unit: string,
  timestampFormatter: (timestamp: number) => string,
  temporalResolution: TemporalResolutionOption
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
    X_AXIS_HEIGHT,
    temporalResolution
  );
  timeseriesList.forEach(timeseries => {
    if (timeseries.points.length > 1) { // draw a line for time series longer than 1
      if (timeseries.isDefaultRun) {
        renderLine(groupElement, timeseries.points, xScale, yScale, timeseries.color, 4);
      } else {
        renderLine(groupElement, timeseries.points, xScale, yScale, timeseries.color);
      }
      // also, draw dots for all the timeseries points
      renderPoint(groupElement, timeseries.points, xScale, yScale, timeseries.color);
    } else { // draw a spot for timeseries that are only 1 long
      renderPoint(groupElement, timeseries.points, xScale, yScale, timeseries.color);
    }
  });

  const timestampLineElement = generateSelectedTimestampLine(
    groupElement,
    height
  );

  generateSelectableTimestamps(
    groupElement,
    timeseriesList,
    xScale,
    height,
    unit,
    onTimestampSelected,
    valueFormatter,
    timestampFormatter
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
  unit: string,
  onTimestampSelected: (timestamp: number) => void,
  valueFormatter: (value: number) => string,
  timestampFormatter: (value: number) => string
) {
  const timestampGroup = selection.append('g');
  const valuesAtEachTimestamp = new Map<number, { color: string; name: string; value: number | string}[]>();
  timeseriesList.forEach(timeseries => {
    const { color, name, points } = timeseries;
    points.forEach(({ value, timestamp }) => {
      if (!valuesAtEachTimestamp.has(timestamp)) {
        valuesAtEachTimestamp.set(timestamp, []);
      }
      const valuesAtThisTimestamp = valuesAtEachTimestamp.get(timestamp);
      if (valuesAtThisTimestamp === undefined) {
        return;
      }
      valuesAtThisTimestamp.push({ color, name, value });
    });
  });

  const uniqueTimestamps = Array.from(valuesAtEachTimestamp.keys());

  // note that the timeseries list may have timeseries each of different number of timestamps
  //  this means that there are missing values at some of the timestamps
  // so, attempt to fill those as n/a for consistency
  uniqueTimestamps.forEach(timestamp => {
    const valuesAtThisTimestamp = valuesAtEachTimestamp.get(timestamp) ?? [];
    if (valuesAtThisTimestamp.length !== timeseriesList.length) {
      //
      // we are missing some values at this timestamp
      //
      timeseriesList.forEach(timeseries => {
        // skip if we do have a value for this timeseries
        const { color, name } = timeseries;
        if (valuesAtThisTimestamp.findIndex(e => e.name === name) < 0) {
          // NOTE: adding this 'n/a' requires careful handling when sorting values
          valuesAtThisTimestamp.push({ color, name, value: 'n/a' });
        }
      });
    }
  });

  // FIXME: We assume that all timestamps are evenly spaced when determining
  //  how wide the hover/click hitbox should be. This may not always be the case.

  // Arbitrarily choose how wide the hitbox should be if there's only one unique
  //  timestamp
  const hitboxWidth =
    uniqueTimestamps.length > 1
      ? xScale(uniqueTimestamps[1]) - xScale(uniqueTimestamps[0])
      : SELECTED_TIMESTAMP_WIDTH * 5;
  const markerHeight = height - PADDING_TOP - X_AXIS_HEIGHT;
  const [minTimestamp, maxTimestamp] = xScale.domain();
  const centerTimestamp = minTimestamp + (maxTimestamp - minTimestamp) / 2;
  uniqueTimestamps.forEach(timestamp => {
    // Display tooltip on the left of the hovered timestamp if that timestamp
    //  is on the right side of the chart to avoid the tooltip overflowing
    //  or being clipped.
    const isRightOfCenter = timestamp > centerTimestamp;
    const markerAndTooltip = timestampGroup
      .append('g')
      .attr(
        'transform',
        translate(xScale(timestamp) - SELECTED_TIMESTAMP_WIDTH / 2, PADDING_TOP)
      )
      .attr('visibility', 'hidden');
    markerAndTooltip
      .append('rect')
      .attr('width', SELECTED_TIMESTAMP_WIDTH)
      .attr('height', markerHeight)
      .attr('fill', SELECTED_COLOR)
      .attr('fill-opacity', SELECTABLE_TIMESTAMP_OPACITY);
    // How far the tooltip is shifted horizontally from the hovered timestamp
    //  also the "radius" of the notch diamond
    const offset = 10;
    const notchSideLength = Math.sqrt(offset * offset + offset * offset);
    const tooltip = markerAndTooltip.append('g')
      .attr('transform', translate(
        isRightOfCenter
          ? -offset - TOOLTIP_WIDTH
          : offset
        , 0)
      );
    tooltip
      .append('rect')
      .attr('width', TOOLTIP_WIDTH)
      .attr('height', markerHeight)
      .attr('fill', TOOLTIP_BG_COLOUR)
      .attr('stroke', TOOLTIP_BORDER_COLOUR);
    // Notch border
    tooltip
      .append('rect')
      .attr('width', notchSideLength + TOOLTIP_BORDER_WIDTH)
      .attr('height', notchSideLength + TOOLTIP_BORDER_WIDTH)
      .attr(
        'transform',
        isRightOfCenter
          ? translate(TOOLTIP_WIDTH - offset - TOOLTIP_BORDER_WIDTH, markerHeight / 2) + 'rotate(-45)'
          : translate(-TOOLTIP_BORDER_WIDTH - offset, markerHeight / 2) + 'rotate(-45)'
      )
      .attr('fill', TOOLTIP_BORDER_COLOUR);
    // Notch background
    // Extend side length of notch background to make sure it covers the right
    //  half of the border rect
    tooltip
      .append('rect')
      .attr('width', notchSideLength * 2)
      .attr('height', notchSideLength * 2)
      .attr(
        'transform',
        isRightOfCenter
          ? translate(TOOLTIP_WIDTH - 3 * offset, markerHeight / 2) + 'rotate(-45)'
          : translate(-offset, markerHeight / 2) + 'rotate(-45)'
      )
      .attr('fill', TOOLTIP_BG_COLOUR);
    // Display units
    tooltip
      .append('text')
      .attr('transform', translate(TOOLTIP_WIDTH - TOOLTIP_PADDING, TOOLTIP_LINE_HEIGHT))
      .style('text-anchor', 'end')
      .style('fill', '#9C9D9E') // text-color-medium
      .text(unit);
    // Display a line for each value at this timestamp
    (valuesAtEachTimestamp.get(timestamp) ?? [])
      .sort(({ value: valueA }, { value: valueB }) => {
        // strings should always be sorted at the bottom
        return (typeof valueA === 'number' && typeof valueB === 'number') ? (valueB - valueA) : 1;
      })
      .forEach(({ color, name, value }, index) => {
        // +1 line because the origin point for text elements is the bottom left corner
        // +1 line because the units are displayed above
        const yPosition = TOOLTIP_LINE_HEIGHT * (index + 2);
        // max number of chars before truncating the text of each qualifier value
        // FIXME: this is a simplification rather than calculating the actual name/value pixel width and truncate accordingly
        const maxNameLen = 10;
        tooltip
          .append('text')
          .attr('transform', translate(TOOLTIP_PADDING, yPosition))
          .style('fill', color)
          .style('font-weight', 'bold')
          .text(name?.length > maxNameLen ? name.substring(0, maxNameLen) + '...' : name);
        tooltip
          .append('text')
          .attr('transform', translate(TOOLTIP_WIDTH - TOOLTIP_PADDING, yPosition))
          .style('text-anchor', 'end')
          .style('fill', color)
          .text(typeof value === 'string' ? value : valueFormatter(value));
      });
    // Display hovered timestamp
    tooltip
      .append('text')
      .attr('transform', translate(TOOLTIP_WIDTH - TOOLTIP_PADDING, markerHeight - TOOLTIP_PADDING))
      .style('text-anchor', 'end')
      .style('fill', SELECTED_COLOR_DARK)
      .text(timestampFormatter(timestamp));
    // Hover hitbox
    timestampGroup
      .append('rect')
      .attr('width', hitboxWidth)
      .attr('height', markerHeight)
      .attr(
        'transform',
        translate(xScale(timestamp) - hitboxWidth / 2, PADDING_TOP)
      )
      .attr('fill-opacity', 0)
      .style('cursor', 'pointer')
      .on('mouseenter', () => markerAndTooltip.attr('visibility', 'visible'))
      .on('mouseleave', () => markerAndTooltip.attr('visibility', 'hidden'))
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
