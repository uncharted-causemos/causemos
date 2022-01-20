import * as d3 from 'd3';
import _ from 'lodash';
import { RidgelinePoint } from '@/utils/ridgeline-util';
import { translate } from '@/utils/svg-util';
import { calculateGenericTicks } from '@/utils/timeseries-util';
import { chartValueFormatter } from '@/utils/string-util';

const RIDGELINE_STROKE_WIDTH = 1;
const RIDGELINE_STROKE_COLOR = 'none';
const RIDGELINE_VERTICAL_AXIS_WIDTH = 1;
const RIDGELINE_VERTICAL_AXIS_COLOR = '#F3F3F3';
const LABEL_COLOR = '#999';
const MAX_LABEL_SIZE = 10;
const CONTEXT_BRACKET_LINE_WIDTH = 1;
const CONTEXT_BRACKET_COLOR = LABEL_COLOR;
export const CONTEXT_BRACKET_WIDTH = 2;

export const renderRidgelines = (
  selection: d3.Selection<SVGElement, any, any, any>,
  ridgeline: RidgelinePoint[],
  width: number,
  height: number,
  min: number,
  max: number,
  showYAxisLabels = false,
  showYAxisLine = true,
  fillColor = 'black',
  label = '',
  contextRange: { min: number; max: number } | null = null
) => {
  const gElement = selection.append('g');
  // Calculate scales
  const xScale = d3
    .scaleLinear()
    .domain([0, 1])
    .range([0, width]);
  // If yAxis labels are visible, leave padding of size `labelSize / 2` at the
  //  top and bottom so the labels aren't clipped
  const labelSize = width > MAX_LABEL_SIZE ? MAX_LABEL_SIZE : width;
  const yRange = showYAxisLabels
    ? [height - labelSize / 2, labelSize / 2]
    : [height, 0];
  const yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range(yRange)
    .clamp(true);
  // Create a line generator that will be used to render the ridgeline
  const line = d3
    .line<RidgelinePoint>()
    .x(point => xScale(point.value))
    .y(point => yScale(point.coordinate));
  // Draw vertical line to act as a baseline
  if (showYAxisLine) {
    gElement
      .append('rect')
      .attr('width', RIDGELINE_VERTICAL_AXIS_WIDTH)
      .attr('height', height)
      .attr('fill', RIDGELINE_VERTICAL_AXIS_COLOR)
      .attr('x', 0)
      .attr('y', 0);
  }
  // Draw ridgeline itself
  gElement
    .append('path')
    .attr('fill', fillColor)
    .attr('stroke', RIDGELINE_STROKE_COLOR)
    .attr('stroke-width', RIDGELINE_STROKE_WIDTH)
    .attr('d', () => line(ridgeline));
  // Draw time slice label
  if (label !== '') {
    gElement
      .append('text')
      .attr(
        'transform',
        // Nudge labels down a little so they're not overlapped by context range bracket
        translate(-labelSize / 2, height + labelSize / 2)
      )
      .attr('font-size', labelSize)
      .style('fill', LABEL_COLOR)
      .text(label);
  }
  // Draw Y Axis labels
  if (showYAxisLabels) {
    const domain = yScale.domain();
    const ticks = calculateGenericTicks(domain[0], domain[1]);
    const formatter = chartValueFormatter(...domain);
    gElement
      .selectAll('.tick')
      .data(ticks)
      .join('text')
      .classed('tick', true)
      .attr('transform', tickValue =>
        // Nudge labels down a little so they're more centered on their tick
        //  value, but not so far that the bottom label's commas are cut off.
        translate(0, yScale(tickValue) + labelSize / 4)
      )
      .attr('font-size', labelSize)
      .style('fill', LABEL_COLOR)
      .text(tickValue => formatter(tickValue));
  }
  // Draw context range
  if (contextRange !== null) {
    // Clamp context range to the node's min/max so it doesn't overflow
    const clampedContextRange = {
      min: _.clamp(contextRange.min, min, max),
      max: _.clamp(contextRange.max, min, max)
    };
    // Vertical line
    gElement
      .append('rect')
      .attr(
        'transform',
        translate(-CONTEXT_BRACKET_WIDTH, yScale(clampedContextRange.max))
      )
      .attr('width', CONTEXT_BRACKET_LINE_WIDTH)
      .attr(
        'height',
        Math.abs(
          yScale(clampedContextRange.max) - yScale(clampedContextRange.min)
        )
      )
      .style('fill', CONTEXT_BRACKET_COLOR);
    // Top tick
    gElement
      .append('rect')
      .attr(
        'transform',
        translate(-CONTEXT_BRACKET_WIDTH, yScale(clampedContextRange.max))
      )
      .attr('width', CONTEXT_BRACKET_WIDTH)
      .attr('height', CONTEXT_BRACKET_LINE_WIDTH)
      .style('fill', CONTEXT_BRACKET_COLOR);
    // Bottom tick
    gElement
      .append('rect')
      .attr(
        'transform',
        translate(
          -CONTEXT_BRACKET_WIDTH,
          yScale(clampedContextRange.min) - CONTEXT_BRACKET_LINE_WIDTH
        )
      )
      .attr('width', CONTEXT_BRACKET_WIDTH)
      .attr('height', CONTEXT_BRACKET_LINE_WIDTH)
      .style('fill', CONTEXT_BRACKET_COLOR);
  }
  return gElement;
};
