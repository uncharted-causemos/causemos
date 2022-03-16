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
// How far the tooltip is shifted horizontally from the hovered timestamp
//  also the "radius" of the notch diamond
const TOOLTIP_OFFSET = 10;

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

function generateMarkerAndTooltip(
  timestampGroup: D3GElementSelection,
  markerHeight: number,
  unit: string,
  timestampFormatter: (timestamp: number) => string,
  valueFormatter: (value: number) => string
) {
  const markerAndTooltip = timestampGroup
    .append('g')
    .attr('visibility', 'hidden');

  markerAndTooltip
    .append('rect')
    .attr('width', SELECTED_TIMESTAMP_WIDTH)
    .attr('height', markerHeight)
    .attr('fill', SELECTED_COLOR)
    .attr('fill-opacity', SELECTABLE_TIMESTAMP_OPACITY);

  const notchSideLength = Math.sqrt(
    TOOLTIP_OFFSET * TOOLTIP_OFFSET +
    TOOLTIP_OFFSET * TOOLTIP_OFFSET
  );
  const tooltip = markerAndTooltip.append('g');
  tooltip
    .append('rect')
    .attr('width', TOOLTIP_WIDTH)
    .attr('height', markerHeight)
    .attr('fill', TOOLTIP_BG_COLOUR)
    .attr('stroke', TOOLTIP_BORDER_COLOUR);

  const notchBorder = tooltip
    .append('rect')
    .attr('width', notchSideLength + TOOLTIP_BORDER_WIDTH)
    .attr('height', notchSideLength + TOOLTIP_BORDER_WIDTH)
    .attr('fill', TOOLTIP_BORDER_COLOUR);

  // Extend side length of notch background to make sure it covers the right
  //  half of the border rect
  const notchBackground = tooltip
    .append('rect')
    .attr('width', notchSideLength * 2)
    .attr('height', notchSideLength * 2)
    .attr('fill', TOOLTIP_BG_COLOUR);
  // Display units
  tooltip
    .append('text')
    .attr('transform', translate(TOOLTIP_WIDTH - TOOLTIP_PADDING, TOOLTIP_LINE_HEIGHT))
    .style('text-anchor', 'end')
    .style('fill', '#9C9D9E') // text-color-medium
    .text(unit);
  // Display hovered timestamp
  const timestampText = tooltip
    .append('text')
    .attr('transform', translate(TOOLTIP_WIDTH - TOOLTIP_PADDING, markerHeight - TOOLTIP_PADDING))
    .style('text-anchor', 'end')
    .style('fill', SELECTED_COLOR_DARK);

  const updateMarkerAndTooltip = (
    timestamp: number,
    isRightOfCenter: boolean,
    valuesAtThisTimestamp: { color: string, name: string, value: string | number}[],
    xScale: d3.ScaleLinear<number, number>
  ) => {
    markerAndTooltip.attr('visibility', 'visible');
    // Move marker
    markerAndTooltip.attr('transform', translate(xScale(timestamp) - SELECTED_TIMESTAMP_WIDTH / 2, PADDING_TOP));
    // Move tooltip
    tooltip.attr('transform', translate(
      isRightOfCenter
        ? -TOOLTIP_OFFSET - TOOLTIP_WIDTH
        : TOOLTIP_OFFSET
      , 0)
    );
    notchBorder.attr(
      'transform',
      isRightOfCenter
        ? translate(
          TOOLTIP_WIDTH - TOOLTIP_OFFSET - TOOLTIP_BORDER_WIDTH,
          markerHeight / 2
        ) + 'rotate(-45)'
        : translate(
          -TOOLTIP_BORDER_WIDTH - TOOLTIP_OFFSET,
          markerHeight / 2
        ) + 'rotate(-45)'
    );
    notchBackground
      .attr(
        'transform',
        isRightOfCenter
          ? translate(
            TOOLTIP_WIDTH - 3 * TOOLTIP_OFFSET,
            markerHeight / 2
          ) + 'rotate(-45)'
          : translate(-TOOLTIP_OFFSET, markerHeight / 2) + 'rotate(-45)'
      );
    // Update tooltip text
    timestampText.text(timestampFormatter(timestamp));
    // Display a line for each value at this timestamp.
    tooltip.selectAll('.tooltip-row').remove();
    valuesAtThisTimestamp.sort(({ value: valueA }, { value: valueB }) => {
      // strings should always be sorted at the bottom
      return (typeof valueA === 'number' && typeof valueB === 'number') ? (valueB - valueA) : 1;
    })
      .forEach(({ color, name, value }, index) => {
        // +1 line because the origin point for text elements is the bottom left corner
        // +1 line because the units are displayed above
        const yPosition = TOOLTIP_LINE_HEIGHT * (index + 2);
        // Truncate timeseries names longer than this length
        // FIXME: Calculate the actual name/value pixel width and truncate accordingly
        const maxNameLength = 10;
        tooltip
          .append('text')
          .classed('tooltip-row', true)
          .attr('transform', translate(TOOLTIP_PADDING, yPosition))
          .style('fill', color)
          .style('font-weight', 'bold')
          .text(
            name.length > maxNameLength
              ? name.substring(0, maxNameLength) + '...'
              : name
          );
        tooltip
          .append('text')
          .classed('tooltip-row', true)
          .attr('transform', translate(TOOLTIP_WIDTH - TOOLTIP_PADDING, yPosition))
          .style('text-anchor', 'end')
          .style('fill', color)
          .text(typeof value === 'string' ? value : valueFormatter(value));
      });
  };
  return {
    updateMarkerAndTooltip,
    hideMarkerAndTooltip: () => markerAndTooltip.attr('visibility', 'hidden')
  };
}

function getValuesAtEachTimestamp(timeseriesList: Timeseries[]) {
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
  return valuesAtEachTimestamp;
}

function getClosestSelectableTimestamp(sortedTimestamps: number[], targetTimestamp: number) {
  if (sortedTimestamps.length === 0) {
    return 0;
  }
  let closestTimestamp = 0;
  for (const timestamp of sortedTimestamps) {
    if (timestamp > targetTimestamp) {
      if ((timestamp - targetTimestamp) < (targetTimestamp - closestTimestamp)) {
        closestTimestamp = timestamp;
      }
      return closestTimestamp;
    }
    closestTimestamp = timestamp;
  }
  return closestTimestamp;
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
  const valuesAtEachTimestamp = getValuesAtEachTimestamp(timeseriesList);
  const sortedUniqueTimestamps = Array.from(
    valuesAtEachTimestamp.keys()
  ).sort((a, b) => a - b);

  // The timeseries in the list may have timestamps that don't overlap. Fill in
  //  `n/a` for each timeseries that doesn't have a value at a given timestep.
  sortedUniqueTimestamps.forEach(timestamp => {
    const valuesAtThisTimestamp = valuesAtEachTimestamp.get(timestamp) ?? [];
    if (valuesAtThisTimestamp.length !== timeseriesList.length) {
      // We're missing one or more values at this timestamp
      timeseriesList.forEach(({ color, name }) => {
        if (valuesAtThisTimestamp.findIndex(e => e.name === name) < 0) {
          // This timeseries is missing a value at this timestamp
          valuesAtThisTimestamp.push({ color, name, value: 'n/a' });
        }
      });
    }
  });

  const xRange = xScale.range();
  const centerPoint = xRange[0] + (xRange[1] - xRange[0]) / 2;
  const markerHeight = height - PADDING_TOP - X_AXIS_HEIGHT;

  const {
    hideMarkerAndTooltip,
    updateMarkerAndTooltip
  } = generateMarkerAndTooltip(
    timestampGroup,
    markerHeight,
    unit,
    timestampFormatter,
    valueFormatter
  );

  const updateHoveredTimestamp = ({ offsetX }: MouseEvent) => {
    const hoveredTimestamp = xScale.invert(offsetX);
    const closestTimestamp = getClosestSelectableTimestamp(
      sortedUniqueTimestamps,
      hoveredTimestamp
    );
    // Display tooltip on the left of the hovered timestamp if that timestamp
    //  is on the right side of the chart to avoid the tooltip overflowing
    //  or being clipped.
    const isRightOfCenter = offsetX > centerPoint;
    const valuesAtThisTimestamp =
      valuesAtEachTimestamp.get(closestTimestamp) ?? [];
    updateMarkerAndTooltip(
      closestTimestamp,
      isRightOfCenter,
      valuesAtThisTimestamp,
      xScale
    );
  };

  const onMouseDown = ({ offsetX }: MouseEvent) => {
    const targetTimestamp = xScale.invert(offsetX);
    const closestTimestamp = getClosestSelectableTimestamp(
      sortedUniqueTimestamps,
      targetTimestamp
    );
    onTimestampSelected(closestTimestamp);
  };

  // Create hitbox to capture mouse events
  timestampGroup
    .append('rect')
    .attr(
      'transform',
      translate(xRange[0], PADDING_TOP)
    )
    .attr('width', xRange[1] - xRange[0])
    .attr('height', markerHeight)
    .attr('fill-opacity', 0)
    .style('cursor', 'pointer')
    .on('mouseenter', updateHoveredTimestamp)
    .on('mousemove', updateHoveredTimestamp)
    .on('mouseleave', hideMarkerAndTooltip)
    .on('mousedown', onMouseDown);
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
