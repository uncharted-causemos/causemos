import * as d3 from 'd3';
import _ from 'lodash';
import { translate } from '@/utils/svg-util';
import { SELECTED_COLOR, SELECTED_COLOR_DARK } from '@/utils/colors-util';
import { chartValueFormatter } from '@/utils/string-util';
import dateFormatter from '@/formatters/date-formatter';
import { Timeseries, TimeseriesPoint } from '@/types/Timeseries';
import { D3Selection, D3GElementSelection } from '@/types/D3';
import { TemporalAggregationLevel, TIMESERIES_HEADER_SEPARATOR } from '@/types/Enums';
import { MAX_TIMESERIES_LABEL_CHAR_LENGTH, renderAxes, renderLine, renderPoint, xAxis } from '@/utils/timeseries-util';

const X_AXIS_HEIGHT = 20;
const Y_AXIS_WIDTH = 40;
const PADDING_TOP = 10;
const PADDING_RIGHT = 40;

const CONTEXT_RANGE_FILL = SELECTED_COLOR;
const CONTEXT_RANGE_STROKE = SELECTED_COLOR_DARK;
const CONTEXT_RANGE_OPACITY = 0.4;
const CONTEXT_TIMESERIES_OPACITY = 0.2;
const TOOLTIP_OFFSET = 10;
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

// FIXME: add range selection/brushing support
export default function(
  selection: D3Selection,
  timeseriesList: Timeseries[],
  width: number,
  height: number,
  selectedTimestamp: number | null,
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

  const xExtentCorrected: [number, number] = (breakdownOption === TemporalAggregationLevel.Year ? [0, 11] : xExtent);

  const valueFormatter = chartValueFormatter(...yExtent);
  const [xScale, yScale] = calculateScales(
    width,
    height,
    xExtentCorrected,
    yExtent
  );

  const timestampFormatter =
    breakdownOption === TemporalAggregationLevel.Year
      ? BY_YEAR_DATE_FORMATTER
      : DATE_FORMATTER;
  const [xAxisSelection, _] = renderAxes(
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

  const state = { selectedTimestamp, selectionDomain: xExtentCorrected };

  const timeseriesListValueCorrected = timeseriesList.map(timeseries => {
    const points = timeseries.points.map(p => ({ timestamp: p.timestamp, value: p.normalizedValue !== undefined ? p.normalizedValue : p.value }));
    return { ...timeseries, points };
  }).filter(() => true);
  // Render lines
  const lineSelections = timeseriesListValueCorrected.filter(timeseries => timeseries.points.length > 1).map(timeseries => {
    const lineSelection = renderLine(groupElement, timeseries.points, xScale, yScale, timeseries.color, 1);
    return { lineSelection, points: timeseries.points };
  });
  // Render points
  timeseriesListValueCorrected.forEach(timeseries => {
    renderPoint(groupElement, timeseries.points, xScale, yScale, timeseries.color);
  });

  const timestampElements = generateSelectedTimestampElements(
    groupElement,
    height,
    width,
    timeseriesList
  );

  const valuesAtEachTimestamp = getValuesAtEachTimestampMap(timeseriesList, timeseriesToDatacubeMap);
  const uniqueTimestamps = getUniqueTimeStamps(valuesAtEachTimestamp);
  const closestTimestamps = getClosestTimestamps(uniqueTimestamps);

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
    .filter(event => !event.selection)
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
    if (selection === null) return;
    const [x0, x1] = selection.map(xScale.invert);
    state.selectionDomain = [x0, x1];
    onTimestampRangeSelected(...state.selectionDomain);
    groupElement.select('.brush').call(brushHandle as any, selection);

    const xScaleBrushed = calculateXScale(width, state.selectionDomain);
    const line = d3
      .line<TimeseriesPoint>()
      .x(d => xScaleBrushed(d.timestamp))
      .y(d => yScale(d.value));

    // Update x Axis
    xAxisSelection.call(xAxis(xScaleBrushed, timestampFormatter));
    // Update points
    groupElement.selectAll('circle.circle').attr('cx', (d: any) => xScaleBrushed(d.timestamp));
    // Update lines
    lineSelections.forEach(({ points, lineSelection }) => {
      lineSelection.attr('d', () => line(points as TimeseriesPoint[]));
    });

    // Update Selectable timestamp
    const hitboxWidth = calculateHitboxWidth(closestTimestamps, xScaleBrushed);
    groupElement.selectAll('.timestamp-group .hitbox')
      .attr('width', hitboxWidth)
      .attr(
        'transform',
        ts => translate(xScaleBrushed(ts as number) - hitboxWidth / 2, PADDING_TOP)
      );

    // Update tooltip position
    updateTooltipPosition(groupElement.select('.timestamp-group'), xScaleBrushed, height);

    // Update selection
    updateTimestampElements(
      state.selectedTimestamp,
      timestampElements,
      xScaleBrushed,
      timestampFormatter
    );
  }

  generateSelectableTimestamps(
    groupElement,
    xScale,
    height,
    timeseriesToDatacubeMap,
    valuesAtEachTimestamp,
    uniqueTimestamps,
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
    state.selectedTimestamp = timestamp;
    updateTimestampElements(
      state.selectedTimestamp,
      timestampElements,
      calculateXScale(width, state.selectionDomain),
      timestampFormatter
    );
  };
}

function calculateExtents(timeseriesList: Timeseries[]) {
  const allPoints = timeseriesList.map(timeSeries => timeSeries.points).flat();
  const xExtent = d3.extent(allPoints.map(point => point.timestamp));
  const yExtent = d3.extent(allPoints.map(point => (point.normalizedValue !== undefined ? point.normalizedValue : point.value)));
  return [xExtent, yExtent];
}

function calculateScales(
  width: number,
  height: number,
  xExtent: [number, number],
  yExtent: [number, number]
) {
  return [
    calculateXScale(width, xExtent),
    calculateYScale(height, yExtent)
  ];
}

function calculateXScale(width: number, xExtent: [number, number]) {
  const xScale = d3
    .scaleLinear()
    .domain(xExtent)
    .range([Y_AXIS_WIDTH, width - PADDING_RIGHT]);
  return xScale;
}

function calculateYScale(height: number, yExtent: [number, number]) {
  const yScale = d3
    .scaleLinear()
    .domain(yExtent)
    .range([height - X_AXIS_HEIGHT, PADDING_TOP]);
  return yScale;
}

function getValuesAtEachTimestampMap(
  timeseriesList: Timeseries[],
  timeseriesToDatacubeMap: { [x: string]: {datacubeName: string;datacubeOutputVariable: string} }

) {
  const valuesAtEachTimestamp = new Map<number, { owner: string; color: string; name: string; value: number | string}[]>();
  const allTimestamps = _.uniq(
    timeseriesList
      .map(timeSeries => timeSeries.points)
      .flat()
      .map(point => point.timestamp));
  allTimestamps.forEach(timestamp => {
    timeseriesList.forEach(timeseries => {
      const { color, name, points } = timeseries;
      const ownerDatacube = timeseriesToDatacubeMap[timeseries.id].datacubeName + TIMESERIES_HEADER_SEPARATOR + timeseriesToDatacubeMap[timeseries.id].datacubeOutputVariable;
      const pointAtTimestamp = points.find(p => p.timestamp === timestamp);
      if (!valuesAtEachTimestamp.has(timestamp)) {
        valuesAtEachTimestamp.set(timestamp, []);
      }
      // current timeseries has data for the timestamp
      const valuesAtThisTimestamp = valuesAtEachTimestamp.get(timestamp);
      if (valuesAtThisTimestamp === undefined) {
        return;
      }
      valuesAtThisTimestamp.push({ owner: ownerDatacube, color, name, value: pointAtTimestamp !== undefined ? (pointAtTimestamp.normalizedValue !== undefined ? pointAtTimestamp.normalizedValue : pointAtTimestamp.value) : 'no data' });
    });
  });

  return valuesAtEachTimestamp;
}

function getUniqueTimeStamps(valuesAtEachTimestamp: Map<number, { owner: string; color: string; name: string; value: number | string}[]>) {
  const uniqueTimestamps = Array.from(valuesAtEachTimestamp.keys()).sort((b, a) => +b - +a);
  return uniqueTimestamps;
}

function getClosestTimestamps(uniqueTimestamps: number[]) {
  // Assume uniqueTimestamps are sorted
  if (uniqueTimestamps.length < 2) {
    return [...uniqueTimestamps];
  }
  const minResult = { pair: [0, 0], diff: Infinity };
  for (let index = 1; index < uniqueTimestamps.length; index++) {
    const tsA = uniqueTimestamps[index - 1];
    const tsB = uniqueTimestamps[index];
    const diff = tsB - tsA;
    if (diff > 0 && diff < minResult.diff) {
      minResult.pair = [tsA, tsB];
      minResult.diff = diff;
    }
  }
  return minResult.pair;
}

function calculateHitboxWidth(timestamps: number[], xScale: d3.ScaleLinear<number, number>) {
  // Calculate hit box width based on the distance of the provided pair of timestamps

  // Arbitrarily choose how wide the hitbox should be if there's only one unique
  //  timestamp
  const hitboxWidth =
    timestamps.length > 1
      ? xScale(timestamps[1]) - xScale(timestamps[0])
      : SELECTED_TIMESTAMP_WIDTH * 5;
  return hitboxWidth;
}

function getCenterValue(scale: d3.ScaleLinear<number, number>) {
  const [x0, x1] = scale.domain();
  const center = x0 + (x1 - x0) / 2;
  return center;
}

function updateTooltipPosition(selection: D3GElementSelection, xScale: d3.ScaleLinear<number, number>, height: number) {
  const markerHeight = height - PADDING_TOP - X_AXIS_HEIGHT;
  const centerValue = getCenterValue(xScale);

  // Display tooltip on the left of the hovered timestamp if that timestamp
  //  is on the right side of the chart to avoid the tooltip overflowing
  //  or being clipped.
  const isRightOfCenter = (ts: number) => ts > centerValue;

  selection.selectAll('.timestamp-group .marker-tooltip').attr(
    'transform',
    ts => translate(xScale(ts as number) - SELECTED_TIMESTAMP_WIDTH / 2, PADDING_TOP)
  );
  selection.selectAll('.hover-tooltip').attr(
    'transform',
    ts => translate(isRightOfCenter(ts as number) ? (-TOOLTIP_OFFSET - TOOLTIP_WIDTH) : TOOLTIP_OFFSET, 0)
  );
  selection.selectAll('.notch-border').attr(
    'transform',
    ts => isRightOfCenter(ts as number)
      ? translate(TOOLTIP_WIDTH - TOOLTIP_OFFSET - TOOLTIP_BORDER_WIDTH, markerHeight / 2) + 'rotate(-45)'
      : translate(-TOOLTIP_BORDER_WIDTH - TOOLTIP_OFFSET, markerHeight / 2) + 'rotate(-45)'
  );
  selection.selectAll('.notch-background').attr(
    'transform',
    ts => isRightOfCenter(ts as number)
      ? translate(TOOLTIP_WIDTH - 3 * TOOLTIP_OFFSET, markerHeight / 2) + 'rotate(-45)'
      : translate(-TOOLTIP_OFFSET, markerHeight / 2) + 'rotate(-45)'
  );
}

function generateSelectableTimestamps(
  selection: D3GElementSelection,
  xScale: d3.ScaleLinear<number, number>,
  height: number,
  timeseriesToDatacubeMap: { [x: string]: {datacubeName: string;datacubeOutputVariable: string} },
  valuesAtEachTimestamp: Map<number, { owner: string; color: string; name: string; value: number | string}[]>,
  uniqueTimestamps: number[],
  timestampFormatter: (timestamp: number) => string,
  onTimestampSelected: (timestamp: number) => void,
  valueFormatter: (value: number) => string
) {
  const timestampGroup = selection.append('g').classed('timestamp-group', true);

  const closestTimestamps = getClosestTimestamps(uniqueTimestamps);
  const hitboxWidth = calculateHitboxWidth(closestTimestamps, xScale);
  const markerHeight = height - PADDING_TOP - X_AXIS_HEIGHT;
  uniqueTimestamps.forEach(timestamp => {
    const markerAndTooltip = timestampGroup
      .append('g')
      .datum(timestamp)
      .classed('marker-tooltip', true)
      .attr('visibility', 'hidden');
    markerAndTooltip
      .append('rect')
      .attr('width', SELECTED_TIMESTAMP_WIDTH)
      .attr('height', markerHeight)
      .attr('fill', SELECTED_COLOR)
      .attr('fill-opacity', SELECTABLE_TIMESTAMP_OPACITY);

    // How far the tooltip is shifted horizontally from the hovered timestamp
    //  also the "radius" of the notch diamond
    const notchSideLength = Math.sqrt(TOOLTIP_OFFSET * TOOLTIP_OFFSET + TOOLTIP_OFFSET * TOOLTIP_OFFSET);
    const tooltip = markerAndTooltip.append('g')
      .datum(timestamp)
      .classed('hover-tooltip', true);
    tooltip
      .append('rect')
      .attr('width', TOOLTIP_WIDTH)
      .attr('height', markerHeight)
      .attr('fill', TOOLTIP_BG_COLOUR)
      .attr('stroke', TOOLTIP_BORDER_COLOUR);
    // Notch border
    tooltip
      .append('rect')
      .datum(timestamp)
      .classed('notch-border', true)
      .attr('width', notchSideLength + TOOLTIP_BORDER_WIDTH)
      .attr('height', notchSideLength + TOOLTIP_BORDER_WIDTH)
      .attr('fill', TOOLTIP_BORDER_COLOUR);
    // Notch background
    // Extend side length of notch background to make sure it covers the right
    //  half of the border rect
    tooltip
      .append('rect')
      .datum(timestamp)
      .classed('notch-background', true)
      .attr('width', notchSideLength * 2)
      .attr('height', notchSideLength * 2)
      .attr('fill', TOOLTIP_BG_COLOUR);

    //
    // Display a line for each value at this timestamp (organized under datacubes)
    //
    const includeSectionHeaders = false;
    let yPosition = 0;
    let lineCounter = 1; // +1 line because the origin point for text elements is the bottom left corner
    // max number of chars before truncating the text of each qualifier value
    // FIXME: this is a simplification rather than calculating the actual name/value pixel width and truncate accordingly
    Object.keys(timeseriesToDatacubeMap).forEach((ownerDatacubeId) => {
      // header; datacube name
      yPosition = TOOLTIP_LINE_HEIGHT * lineCounter;
      const header = timeseriesToDatacubeMap[ownerDatacubeId].datacubeName + TIMESERIES_HEADER_SEPARATOR + timeseriesToDatacubeMap[ownerDatacubeId].datacubeOutputVariable;
      if (includeSectionHeaders) {
        if (yPosition < (markerHeight - TOOLTIP_LINE_HEIGHT)) {
          tooltip
            .append('text')
            .attr('transform', translate(TOOLTIP_PADDING, yPosition))
            .style('fill', 'black')
            .style('font-weight', 'bold')
            .text(header.length > MAX_TIMESERIES_LABEL_CHAR_LENGTH ? header.substring(0, MAX_TIMESERIES_LABEL_CHAR_LENGTH) + '...' : header);
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
              .text(name.length > MAX_TIMESERIES_LABEL_CHAR_LENGTH ? name.substring(0, MAX_TIMESERIES_LABEL_CHAR_LENGTH) + '...' : name);
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
      .datum(timestamp)
      .classed('hitbox', true)
      .attr('width', hitboxWidth)
      .attr('height', height - PADDING_TOP - X_AXIS_HEIGHT)
      .attr(
        'transform',
        ts => translate(xScale(ts) - hitboxWidth / 2, PADDING_TOP)
      )
      .attr('fill-opacity', 0)
      .style('cursor', 'pointer')
      .on('mouseenter', () => markerAndTooltip.attr('visibility', 'visible'))
      .on('mouseleave', () => markerAndTooltip.attr('visibility', 'hidden'))
      .on('mousedown', () => onTimestampSelected(timestamp));
  });
  updateTooltipPosition(selection.select('.timestamp-group'), xScale, height);
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
