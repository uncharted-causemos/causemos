import * as d3 from 'd3';
import { RidgelinePoint } from '@/utils/ridgeline-util';
import { translate } from '@/utils/svg-util';
import { calculateGenericTicks } from '@/utils/timeseries-util';
import { chartValueFormatter } from '@/utils/string-util';

const RIDGELINE_STROKE_WIDTH = 1;
const RIDGELINE_STROKE_COLOR = 'none';
const RIDGELINE_FILL_COLOR = 'black';
const RIDGELINE_VERTICAL_AXIS_WIDTH = 1;
const RIDGELINE_VERTICAL_AXIS_COLOR = '#F3F3F3';
const LABEL_COLOR = '#999';
const MAX_LABEL_SIZE = 10;

export const renderRidgelines = (
  selection: d3.Selection<SVGElement, any, any, any>,
  ridgeline: RidgelinePoint[],
  width: number,
  height: number,
  min: number,
  max: number,
  showYAxisLabels = false,
  label = ''
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
    // Use curveMonotoneY so that curves between points don't overshoot points
    //  in the X direction. This is necessary so that curves don't dip past the
    //  vertical line that acts as the baseline for each smoothed histogram
    // Other curve types are summarized in the d3 docs:
    //  https://github.com/d3/d3-shape/blob/main/README.md#curves
    .curve(d3.curveMonotoneY)
    .x(point => xScale(point.value))
    .y(point => yScale(point.coordinate));
  // Draw vertical line to act as a baseline
  gElement
    .append('rect')
    .attr('width', RIDGELINE_VERTICAL_AXIS_WIDTH)
    .attr('height', height)
    .attr('fill', RIDGELINE_VERTICAL_AXIS_COLOR)
    .attr('x', 0)
    .attr('y', 0);
  // Draw ridgeline itself
  gElement
    .append('path')
    .attr('fill', RIDGELINE_FILL_COLOR)
    .attr('stroke', RIDGELINE_STROKE_COLOR)
    .attr('stroke-width', RIDGELINE_STROKE_WIDTH)
    .attr('d', () => line(ridgeline));
  // Draw time slice label
  gElement
    .append('text')
    .attr('transform', translate(-labelSize / 2, height))
    .attr('font-size', labelSize)
    .style('fill', LABEL_COLOR)
    .text(label);
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
        translate(0, yScale(tickValue) + labelSize / 2)
      )
      .attr('font-size', labelSize)
      .style('fill', LABEL_COLOR)
      .text(tickValue => formatter(tickValue));
  }
  return gElement;
};
