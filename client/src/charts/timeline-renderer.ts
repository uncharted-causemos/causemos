import * as d3 from 'd3';
import { translate } from '@/utils/svg-util';
import { SELECTED_COLOR, SELECTED_COLOR_DARK } from '@/utils/colors-util';
import { chartValueFormatter } from '@/utils/string-util';
import dateFormatter from '@/formatters/date-formatter';
import { Timeseries } from '@/types/Timeseries';
import { D3Selection, D3GElementSelection } from '@/types/D3';
import { TemporalAggregationLevel } from '@/types/Enums';
import { renderAxes, renderLine, renderPoint } from '@/utils/timeseries-util';
import _ from 'lodash';

const X_AXIS_HEIGHT = 20;
const Y_AXIS_WIDTH = 40;
const PADDING_TOP = 10;
const PADDING_RIGHT = 40;

const CONTEXT_RANGE_FILL = SELECTED_COLOR;
const CONTEXT_RANGE_STROKE = SELECTED_COLOR_DARK;
const CONTEXT_RANGE_OPACITY = 0.4;
const CONTEXT_TIMESERIES_OPACITY = 0.2;
const TOOLTIP_WIDTH = 150;
const TOOLTIP_BG_COLOUR = 'white';
const TOOLTIP_BORDER_COLOUR = 'grey';
const TOOLTIP_BORDER_WIDTH = 1.5;
const TOOLTIP_FONT_SIZE = 10;
const TOOLTIP_PADDING = TOOLTIP_FONT_SIZE / 2;
const TOOLTIP_LINE_HEIGHT = TOOLTIP_FONT_SIZE + TOOLTIP_PADDING;


// The type of value can't be more specific than `any`
//  because under the hood d3.tickFormat requires d3.NumberType.
// It correctly converts, but its TypeScript definitions don't
//  seem to reflect that.

const DATE_FORMATTER = (value: any) =>
  dateFormatter(value, 'MMM DD, YYYY');
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
  breakdownOption: string | null,
  timeseriesToDatacubeMap: { [x: string]: {datacubeName: string;datacubeOutputVariable: string} },
  onTimestampSelected: (timestamp: number) => void,
  onTimestampRangeSelected: (start: number, end: number) => void
) {
  selection.selectAll('*').remove();

  const groupElement = selection.append('g')
    .classed('groupElement', true);

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
    timestampFormatter,
    Y_AXIS_WIDTH,
    PADDING_RIGHT,
    X_AXIS_HEIGHT
  );
  timeseriesList.forEach(timeseries => {
    if (timeseries.points.length > 1) { // draw a line for time series longer than 1
      renderLine(groupElement, timeseries.points, xScale, yScale, timeseries.color, 1);
      renderPoint(groupElement, timeseries.points, xScale, yScale, timeseries.color);
    } else { // draw a spot for timeseries that are only 1 long
      renderPoint(groupElement, timeseries.points, xScale, yScale, timeseries.color);
    }
  });

  //
  // render brush
  //
  groupElement.selectAll('.yAxis').remove();
  groupElement
    .selectAll('.segment-line')
    .attr('opacity', CONTEXT_TIMESERIES_OPACITY);

  const brushHeight = height - X_AXIS_HEIGHT; // the brush would be placed on the x-axis

  // Create brush object and position over context axis
  const brush = d3
    .brushX()
    .extent([
      [xScale.range()[0], 0],
      [xScale.range()[1], X_AXIS_HEIGHT]
    ])
    .on('start brush end', brushed);

  groupElement
    .append('g') // create brush element and move to default
    .attr('transform', translate(0, brushHeight)) // move brush overlay to bottom
    .classed('brush', true)
    .call(brush)
    // set initial brush selection to entire context
    .call(brush.move, xScale.range())
  ;
  selection
    .selectAll('.brush > .selection')
    .attr('fill', CONTEXT_RANGE_FILL)
    .attr('stroke', CONTEXT_RANGE_STROKE)
    .attr('opacity', CONTEXT_RANGE_OPACITY);

  function brushHandle(g: D3GElementSelection, selection: number[]) {
    const enterFn = (enter: D3Selection) => {
      const handleW = 9;
      const handleWGap = -2;
      const handleHGap = 0;
      const handleH = X_AXIS_HEIGHT - 2 * handleHGap;

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

  function brushed({ selection }: { selection: number[] }) {
    const [x0, x1] = selection.map(xScale.invert);
    onTimestampRangeSelected(x0, x1);
    groupElement.select('.brush').call(brushHandle as any, selection);
  }

  const timestampElements = generateSelectedTimestampElements(
    groupElement,
    height,
    width,
    timeseriesList
  );

  generateSelectableTimestamps(
    groupElement,
    timeseriesList,
    xScale,
    height,
    timeseriesToDatacubeMap,
    timestampFormatter,
    onTimestampSelected,
    valueFormatter
  );

  // Set timestamp elements to reflect the initially selected
  //  timestamp
  updateTimestampElements(
    selectedTimestamp,
    timestampElements,
    xScale,
    timestampFormatter
  );
  // Return function to update the timestamp elements when
  //  a parent component selects a different timestamp
  return (timestamp: number | null) => {
    updateTimestampElements(
      timestamp,
      timestampElements,
      xScale,
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

function generateSelectableTimestamps(
  selection: D3GElementSelection,
  timeseriesList: Timeseries[],
  xScale: d3.ScaleLinear<number, number>,
  height: number,
  timeseriesToDatacubeMap: { [x: string]: {datacubeName: string;datacubeOutputVariable: string} },
  timestampFormatter: (timestamp: number) => string,
  onTimestampSelected: (timestamp: number) => void,
  valueFormatter: (value: number) => string
) {
  const timestampGroup = selection.append('g');
  const valuesAtEachTimestamp = new Map<number, { owner: string; color: string; name: string; value: number | string}[]>();
  const allTimestamps = _.uniq(
    timeseriesList
      .map(timeSeries => timeSeries.points)
      .flat()
      .map(point => point.timestamp));
  allTimestamps.forEach(timestamp => {
    timeseriesList.forEach(timeseries => {
      const { color, name, points } = timeseries;
      const ownerDatacube = timeseriesToDatacubeMap[timeseries.id].datacubeName; // FIXME: consider adding output name in the header
      const pointAtTimestamp = points.find(p => p.timestamp === timestamp);
      if (!valuesAtEachTimestamp.has(timestamp)) {
        valuesAtEachTimestamp.set(timestamp, []);
      }
      // current timeseries has data for the timestamp
      const valuesAtThisTimestamp = valuesAtEachTimestamp.get(timestamp);
      if (valuesAtThisTimestamp === undefined) {
        return;
      }
      valuesAtThisTimestamp.push({ owner: ownerDatacube, color, name, value: pointAtTimestamp !== undefined ? pointAtTimestamp.value : 'no data' });
    });
  });

  const uniqueTimestamps = Array.from(valuesAtEachTimestamp.keys()).sort();
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

    //
    // Display a line for each value at this timestamp (organized under datacubes)
    //
    const includeSectionHeaders = false;
    let yPosition = 0;
    let lineCounter = 1; // +1 line because the origin point for text elements is the bottom left corner
    // max number of chars before truncating the text of each qualifier value
    // FIXME: this is a simplification rather than calculating the actual name/value pixel width and truncate accordingly
    const maxNameLen = 16;
    Object.keys(timeseriesToDatacubeMap).forEach((ownerDatacubeId) => {
      // header; datacube name
      yPosition = TOOLTIP_LINE_HEIGHT * lineCounter;
      const header = timeseriesToDatacubeMap[ownerDatacubeId].datacubeName;
      if (includeSectionHeaders) {
        if (yPosition < (markerHeight - TOOLTIP_LINE_HEIGHT)) {
          tooltip
            .append('text')
            .attr('transform', translate(TOOLTIP_PADDING, yPosition))
            .style('fill', 'black')
            .style('font-weight', 'bold')
            .text(header.length > maxNameLen ? header.substring(0, maxNameLen) + '...' : header);
        }
        lineCounter += 1;
      }
      (valuesAtEachTimestamp.get(timestamp) ?? [])
        .filter(timeseriesData => timeseriesData.owner === header)
        .sort(({ value: valueA }, { value: valueB }) => {
          // strings should always be sorted at the bottom
          return (typeof valueA === 'number' && typeof valueB === 'number') ? (valueB - valueA) : 1;
        })
        .forEach(({ color, name, value }) => {
          yPosition = lineCounter * TOOLTIP_LINE_HEIGHT;
          if (yPosition < (markerHeight - TOOLTIP_LINE_HEIGHT)) {
            // list of timeseries names/values
            tooltip
              .append('text')
              .attr('transform', translate(TOOLTIP_PADDING * 2, yPosition))
              .style('fill', color)
              .style('font-weight', 'bold')
              .text(name.length > maxNameLen ? name.substring(0, maxNameLen) + '...' : name);
            tooltip
              .append('text')
              .attr('transform', translate(TOOLTIP_WIDTH - TOOLTIP_PADDING, yPosition))
              .style('text-anchor', 'end')
              .style('fill', color)
              .text(typeof value === 'string' ? value : valueFormatter(value));
          }
          lineCounter += 1;
        });
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
      .attr('height', height - PADDING_TOP - X_AXIS_HEIGHT)
      .attr(
        'transform',
        translate(xScale(timestamp) - hitboxWidth / 2, PADDING_TOP)
      )
      .attr('fill-opacity', 0)
      .style('cursor', 'pointer')
      .on('mouseenter', () => markerAndTooltip.attr('visibility', 'visible'))
      .on('mouseleave', () => markerAndTooltip.attr('visibility', 'hidden'))
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
  xScale: d3.ScaleLinear<number, number>,
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
  // @REVIEW we should not display the value of the marker in the global timeline
  //  since all timeseries values are normalized between 0 and 1
  /// for now, just hide the valueGroups
  valueGroups.forEach(valueGroup => valueGroup.attr('visibility', 'hidden'));
}
