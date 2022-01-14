import * as d3 from 'd3';
import { d3RidgelineWithMetadataSelection, RidgelinePoint } from '@/utils/ridgeline-util';
import { translate } from '@/utils/svg-util';

// TODO: extract some of these to colors-util?
const RIDGELINE_STROKE_WIDTH = 1;
const RIDGELINE_STROKE_COLOR = 'none';
const RIDGELINE_FILL_COLOR = 'black';
const RIDGELINE_VERTICAL_AXIS_WIDTH = 1;
const RIDGELINE_VERTICAL_AXIS_COLOR = '#F3F3F3';
const LABEL_COLOR = '#999';


export const renderRidgelines = (
  selection: d3RidgelineWithMetadataSelection,
  width: number,
  height: number,
  min: number,
  max: number
) => {
  // Calculate scales
  const xScale = d3
    .scaleLinear()
    .domain([0, 1])
    .range([0, width]);
  const yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([height, 0])
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
  selection
    .append('rect')
    .attr('width', RIDGELINE_VERTICAL_AXIS_WIDTH)
    .attr('height', height)
    .attr('fill', RIDGELINE_VERTICAL_AXIS_COLOR)
    .attr('x', 0)
    .attr('y', 0);
  // Draw ridgeline itself
  selection
    .append('path')
    .attr('fill', RIDGELINE_FILL_COLOR)
    .attr('stroke', RIDGELINE_STROKE_COLOR)
    .attr('stroke-width', RIDGELINE_STROKE_WIDTH)
    .attr('d', d => line(d.ridgeline));
  // Draw time slice label
  selection
    .append('text')
    .attr('transform', translate(-width / 2, height))
    .attr('font-size', width)
    .style('fill', LABEL_COLOR)
    .text(d => d.label);
};
