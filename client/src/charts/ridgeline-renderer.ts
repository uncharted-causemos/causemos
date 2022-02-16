import * as d3 from 'd3';
import _ from 'lodash';
import {
  RidgelinePoint,
  RidgelineWithMetadata,
  summarizeRidgelineComparison
} from '@/utils/ridgeline-util';
import svgUtil, { translate } from '@/utils/svg-util';
import { calculateGenericTicks } from '@/utils/timeseries-util';
import { chartValueFormatter } from '@/utils/string-util';

const RIDGELINE_STROKE_WIDTH = 0.5;
const RIDGELINE_VERTICAL_AXIS_WIDTH = 1;
const RIDGELINE_VERTICAL_AXIS_COLOR = '#F3F3F3';
const LABEL_COLOR = '#999';
const LABEL_SIZE = 5;
const CONTEXT_BRACKET_LINE_WIDTH = 1;
const CONTEXT_BRACKET_COLOR = LABEL_COLOR;
export const CONTEXT_BRACKET_WIDTH = 4;

const COMPARISON_COLOR = '#4DAC26'; // green
export const COMPARISON_BASELINE_COLOR = '#AAA'; // grey
const COMPARISON_OVERLAP_COLOR = COMPARISON_BASELINE_COLOR;
const curve = d3.curveMonotoneY;

const SUMMARY_WIDTH_PERCENTAGE = 0.75;
const SUMMARY_ARROW_COLOR = COMPARISON_BASELINE_COLOR;

export const renderRidgelines = (
  selection: d3.Selection<SVGElement, any, any, any>,
  ridgeline: RidgelineWithMetadata,
  comparisonBaseline: RidgelineWithMetadata | null,
  width: number,
  height: number,
  min: number,
  max: number,
  showYAxisLabels = false,
  showYAxisLine = true,
  label = '',
  contextRange: { min: number; max: number } | null = null,
  labelSize = LABEL_SIZE,
  fillColor = 'black'
) => {
  const gElement = selection.append('g');
  const widthAvailableForChart = (1 - SUMMARY_WIDTH_PERCENTAGE) * width;
  // Calculate scales
  const xScale = d3
    .scaleLinear()
    .domain([0, 1])
    .range([0, widthAvailableForChart]);
  // If yAxis labels are visible, leave padding of size `labelSize / 2` at the
  //  top and bottom so the labels aren't clipped
  const yRange = showYAxisLabels
    ? [height - labelSize / 2, labelSize / 2]
    : [height, 0];
  const yScale = d3.scaleLinear().domain([min, max]).range(yRange).clamp(true);
  // Create a line generator that will be used to render the ridgeline
  const line = d3
    .line<RidgelinePoint>()
    .x(point => xScale(point.value))
    .y(point => yScale(point.coordinate))
    .curve(curve);
  // Draw ridgeline itself
  const ridgelineColor =
    comparisonBaseline !== null ? COMPARISON_COLOR : fillColor;
  gElement
    .append('path')
    .attr('fill', ridgelineColor)
    .attr('stroke', ridgelineColor)
    .attr('stroke-width', RIDGELINE_STROKE_WIDTH)
    .attr('d', () => line(ridgeline.ridgeline));

  if (comparisonBaseline !== null) {
    // Draw comparison baseline
    const uid = _.uniqueId();
    // Hatching pattern
    // From: https://stackoverflow.com/questions/13069446/simple-fill-pattern-in-svg-diagonal-hatching
    // OPTIMIZE: we don't need to add this element for every ridgeline as long
    //  as it's in the DOM somewhere
    gElement
      .append('pattern')
      .attr('id', 'hatch' + uid)
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 4)
      .attr('height', 4)
      .append('path')
      .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
      .style('stroke', COMPARISON_BASELINE_COLOR)
      .style('stroke-width', 0.5);
    gElement
      .append('path')
      .attr('fill', `url(#hatch${uid})`)
      .attr('stroke', COMPARISON_BASELINE_COLOR)
      .attr('stroke-width', RIDGELINE_STROKE_WIDTH)
      .attr('d', () => line(comparisonBaseline.ridgeline));

    // Draw overlap
    const area = d3
      .area<RidgelinePoint>()
      .x0(() => xScale(0))
      .x1(point => xScale(point.value))
      .y(point => yScale(point.coordinate))
      .curve(curve);
    gElement
      .append('clipPath')
      .attr('id', uid)
      .append('path')
      .attr('d', area(ridgeline.ridgeline) ?? '');
    gElement
      .append('path')
      .attr('clip-path', `url(#${uid})`)
      .attr('fill', COMPARISON_OVERLAP_COLOR)
      .attr('stroke', COMPARISON_BASELINE_COLOR)
      .attr('stroke-width', RIDGELINE_STROKE_WIDTH)
      .attr('d', area(comparisonBaseline.ridgeline) ?? '');
    // Render relative change summary
    const summary = summarizeRidgelineComparison(
      ridgeline,
      comparisonBaseline,
      min,
      max
    );
    const summarySpacing = 3;
    const summaryXPosition = widthAvailableForChart + summarySpacing;
    gElement
      .append('text')
      .style('font-size', labelSize)
      .style('font-weight', 'normal')
      .attr(
        'transform',
        translate(
          summaryXPosition,
          yScale(ridgeline.distributionMean) + labelSize / 2
        )
      )
      .text(summary.before)
      .append('tspan')
      .style('font-weight', 600)
      .text(summary.emphasized)
      .append('tspan')
      .style('font-weight', 'normal')
      .text(summary.after);
    // Arrow
    const tail = yScale(comparisonBaseline.distributionMean);
    const head = yScale(ridgeline.distributionMean);
    const arrowHeadHeight = 5;
    const arrowHeadWidth = 6.5;
    const arrowHeadOffset = labelSize / 2 + arrowHeadHeight + summarySpacing;
    const arrowHeight = Math.abs(head - tail) - arrowHeadOffset;
    if (arrowHeight > 0) {
      // Arrow isn't too small to draw
      // Draw rect for arrow's stem
      const rectYPosition = tail < head ? tail : head + arrowHeadOffset;
      const rectWidth = 2;
      gElement
        .append('rect')
        .attr('width', rectWidth)
        .attr('height', arrowHeight)
        .attr('fill', SUMMARY_ARROW_COLOR)
        .attr(
          'transform',
          translate(summaryXPosition + (arrowHeadWidth - rectWidth) / 2, rectYPosition)
        );
      // Draw arrow head
      const arrowHeadYPosition =
        tail < head ? head - arrowHeadOffset : head + arrowHeadOffset;
      const rotation = tail < head ? 90 : -90;
      gElement
        .append('path')
        .attr('fill', SUMMARY_ARROW_COLOR)
        .attr('d', svgUtil.ARROW)
        .attr(
          'transform',
          translate(summaryXPosition + arrowHeadWidth / 2, arrowHeadYPosition) +
            ` rotate(${rotation})`
        );
    }
  }
  // Draw vertical line to act as a baseline
  if (showYAxisLine) {
    gElement
      .append('rect')
      .attr('width', RIDGELINE_VERTICAL_AXIS_WIDTH)
      .attr('height', height)
      .attr('fill', RIDGELINE_VERTICAL_AXIS_COLOR)
      .attr('x', -RIDGELINE_VERTICAL_AXIS_WIDTH / 2)
      .attr('y', 0);
  }
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
