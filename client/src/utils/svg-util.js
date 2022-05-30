import _ from 'lodash';
import * as d3 from 'd3';
import moment from 'moment';

import { SELECTED_COLOR_DARK, GRAPH_BACKGROUND_COLOR } from '@/utils/colors-util';
import stringUtil from '@/utils/string-util';

/* SVG Utility functions */

/**
 * Chart wrapper
 * @param {object} svg - D3 svg selection
 * @param {number} w - width
 * @param {number} h - height
 * @param {object} viewport - optional x1, y1, x2, y2.
 */
export const createChart = (svg, w, h, viewport = {}) => {
  svg.attr('width', w + 'px');
  svg.attr('height', h + 'px');

  const x1 = viewport.x1 || 0;
  const y1 = viewport.y1 || 0;
  const x2 = viewport.x2 || w;
  const y2 = viewport.y2 || h;

  svg.attr('preserveAspectRatio', 'xMinYMin meet');
  svg.attr('viewBox', `${x1} ${y1} ${x2} ${y2}`);
  svg.append('defs');

  return svg;
};

export const translate = (x, y) => { return `translate(${x}, ${y})`; };
export const getTranslateFromSVGTransform = (transform) => {
  for (let i = 0; i < transform.baseVal.length; i++) {
    if (transform.baseVal[i].type === 2) { // translate
      return [transform.baseVal[i].matrix.e, transform.baseVal[i].matrix.f];
    }
  }
};

export const arc = (x1, y1, x2, y2, xRadius, yRadius) => {
  const xRotation = 0;
  const largeArcFlag = 0;
  const sweepFlag = 0;
  return `M ${x1} ${y1} A ${xRadius} ${yRadius} ${xRotation} ${largeArcFlag} ${sweepFlag} ${x2} ${y2}`;
};

export const line = (x1, y1, x2, y2) => {
  return 'M' + x1 + ',' + y1 + 'L' + x2 + ',' + y2;
};

// A path generator
export const pathFn = d3.line()
  .x(d => d.x)
  .y(d => d.y);

/**
 * Wrap text as SVG spans
 * See https://bl.ocks.org/mbostock/7555321
 *
 * @param {string} text - text to tokenize
 * @param {number} width - width constraint
 */
export const wrapText = (text, width) => {
  text.each(function() {
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    const lineHeight = 1.1; // ems
    const y = text.attr('y');
    const dy = parseFloat(text.attr('dy'));

    let tspan = text.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');
    let word = null;
    let line = [];
    let lineNumber = 0;
    while (true) {
      word = words.pop();
      if (_.isEmpty(word)) break;

      line.push(word);
      tspan.text(line.join(' '));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(' '));
        line = [word];
        tspan = text.append('tspan').attr('x', 0).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').text(word);
      }
    }
  });
};


/**
 * Generator function for drawing timeseries
 * of the format [{value, timestamp}, {value, timestamp} ...]
 *
 * @param {function} xscale - scaling transform function
 * @param {function} yscale - scaling transform function
 */
// FIXME: each of these d3.line() calls should use TimeSeriesPoint as the
//  generic parameter, like so:
//    d3.line<TimeSeriesPoint>()
//  but can't since this is a JS file. Once it's converted to TS, clean up the
//  places where timeseriesLine is used
export const timeseriesLine = (xscale, yscale, curve = undefined) => {
  if (curve) {
    return d3.line()
      .x(d => xscale(d.timestamp))
      .y(d => yscale(d.value))
      .curve(d3[curve]);
  }
  return d3.line()
    .x(d => xscale(d.timestamp))
    .y(d => yscale(d.value));
};

/**
 * Draws an area chart for a time series of the format
 * [{value, timestamp}, {value, timestamp} ... ]
 *
 * @param {function} xscale - scaling transform function
 * @param {function} yscale - scaling transform function
 * @param {boolean} positive - whether to draw only positive areas or negative areas
 */
export const timeseriesArea = (xscale, yscale, positive) => {
  return d3.area()
    .x(d => xscale(d.timestamp))
    .y0(d => {
      if (positive === false) {
        return d.value <= 0 ? yscale(d.value) : yscale(0);
      } else {
        return yscale(0);
      }
    })
    .y1(d => {
      if (positive === false) {
        return yscale(0);
      } else {
        return d.value <= 0 ? yscale(0) : yscale(d.value);
      }
    });
  // .curve(d3.curveMonotoneX);
};

/**
 * Draws the confidence band for a single projection result
 *
 * @param {function} xscale - scaling transform function
 * @param {function} yscale - scaling transform function
 * @param {object} experimentResults - projection result with values, confidenceInterval.upper and confidenceInterval.lower
 */
export const confidenceArea = (xscale, yscale, experimentResults) => {
  const confidenceInterval = experimentResults.confidenceInterval;
  return d3.area()
    .x(d => xscale(d.timestamp))
    .y0((d, i) => {
      return yscale(confidenceInterval.lower[i].value);
    })
    .y1((d, i) => {
      return yscale(confidenceInterval.upper[i].value);
    });
  // .curve(d3.curveMonotoneX);
};

/**
 * Create and add a crosshair tooltip to given chart element
 * @param {Object} spec
 * @param {Object} spec.chart d3 selection for a chart
 * @param {Function} spec.xscale - scaling transform function for the chart
 * @param {Function} spec.yscale - scaling transform function for the chart
 * @param {Array} spec.seriesData - time series data for the tooltip
 * @param {Array} spec.seriesData[].timestamp - timestamp
 * @param {Array} spec.seriesData[].value - value
 * @param {Function} spec.dateFormatter - date formatter for timestamps
 * @param {Function} spec.valueFormatter - value formatter for the series value
 * @param {Object} spec.style - A style options for the tooltip
 *
 * @returns A tooltip object
 */
export const addCrosshairTooltip = spec => {
  const {
    chart,
    xscale,
    yscale,
    seriesData,
    dateFormatter = v => v,
    valueFormatter = v => v,
    style
  } = spec;

  const tooltipStyle = Object.assign({
    lineColor: SELECTED_COLOR_DARK,
    circleColor: SELECTED_COLOR_DARK,
    textColor: SELECTED_COLOR_DARK
  }, style);

  const yMax = Math.max(...yscale.range());
  const xMax = Math.max(...xscale.range());

  // svg g (chart) element doesn't capture mouse event, so create an overlay for capturing the event
  const overlay = chart.append('rect')
    .style('fill', 'transparent')
    .attr('class', 'event-overlay')
    .attr('width', xMax)
    .attr('height', yMax);

  // Tooltip
  const tooltip = chart
    .append('g')
    .attr('class', 'experiment-chart-tooltip-container')
    .style('display', 'none');

  tooltip.append('line')
    .attr('class', 'x-hover-line')
    .attr('y1', 0)
    .attr('y2', yMax)
    .style('stroke', tooltipStyle.lineColor)
    .style('stroke-width', 2)
    .style('stroke-dasharray', 3.3);

  tooltip.append('circle')
    .style('fill', '#FFFFFF')
    .style('stroke', tooltipStyle.circleColor)
    .style('stroke-width', 2)
    .attr('r', 3);

  // add a rect for the tooltip lable
  //  note this is added before the text to maintain correct order
  //  also note the rect is created with some initial size
  tooltip
    .append('rect')
    .attr('class', 'line-chart-tooltip-text-bkgnd-rect')
    .style('fill', GRAPH_BACKGROUND_COLOR)
    .style('fill-opacity', '.8')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', 10)
    .attr('height', 10);

  tooltip.append('text')
    .attr('class', 'line-chart-tooltip-text')
    .attr('dy', '.35em')
    .style('fill', tooltipStyle.textColor)
    .style('text-anchor', 'middle')
    .style('font-weight', 'bold')
    .attr('x', 0)
    .attr('y', -10);

  const bisectDate = d3.bisector(d => d.timestamp).left;
  overlay.on('mouseover', () => tooltip.style('display', null))
    .on('mouseout', () => tooltip.style('display', 'none'))
    .on('mousemove', function (evt) {
      const series = self.seriesData;
      if (!series.length) {
        return;
      }
      if (series.length === 1) {
        self.select(series[0]);
        return;
      }
      const xPos = xscale.invert(d3.pointer(evt)[0]);
      const elementIndex = bisectDate(series, xPos, 1) >= series.length ? series.length - 1 : bisectDate(series, xPos, 1);
      const prevElement = series[elementIndex - 1];
      const nextElement = series[elementIndex];
      const d = xPos - prevElement.timestamp > nextElement.timestamp - xPos ? nextElement : prevElement;
      self.select(d);
    });

  const self = {
    element: tooltip,
    seriesData,

    /**
     * Update the target time series data for the graph where tooltip will be displayed on
     * @param {Object} series - A time series data for a graph where tooltip will be displayed on
     */
    updateSeries(series) {
      self.seriesData = series;
    },

    /**
     * Select a data point and display the tooltip on it
     * @param {Object} dataPoint a data point in a timeseries data
     * @param {Object} dataPoint.timestamp time stamp
     * @param {Object} dataPoint.value value
     */
    select(dataPoint) {
      const data = dataPoint;
      tooltip.style('display', null);
      tooltip.attr('transform', translate(xscale(data.timestamp), yscale(data.value)));
      tooltip.select('.x-hover-line').attr('y2', yMax - yscale(data.value));
      const text = tooltip.select('.line-chart-tooltip-text');
      text
        .text(`${valueFormatter(data.value)} (${dateFormatter(data.timestamp, 'YYYY-MMM')})`);

      const bbox = text.node().getBBox();
      // adjust the rect beneath the text, to represent the bounding box
      const textRect = tooltip.select('.line-chart-tooltip-text-bkgnd-rect');
      textRect
        .attr('x', bbox.x)
        .attr('y', bbox.y)
        .attr('width', bbox.width)
        .attr('height', bbox.height);
    }
  };
  return self;
};

/**
 * Add style attributes to given d3 selection
 * @param {Object} selection - d3 selection
 * @param {Object} style - A style object
 */
export const style = (selection, style = {}) => {
  for (const [key, value] of Object.entries(style)) {
    selection.style(key, value);
  }
};

/**
 * Calculate the ticks to display for a time-series chart
 * @param {Object} xextent - xscale domain
 * @param {Object} tickInterval - interval between ticks (number of months)
 */
export const calculateTicks = (xextent, tickInterval) => {
  const start = moment.utc(xextent[0]);
  const end = moment.utc(xextent[1]);

  let ticks = xextent;
  let startFormatted = moment.utc(start);
  const endFormatted = moment.utc(end);
  while (moment(startFormatted).isBefore(endFormatted, 'month')) {
    startFormatted = moment(startFormatted).add(tickInterval, 'M');
    ticks.push(startFormatted.valueOf());
  }
  // Sort timestamps
  ticks = _.orderBy(ticks);
  // Remove the last timestamp added after checking the condition
  const last = moment.utc(_.last(ticks));
  if (moment(last).isSame(endFormatted, 'month')) {
    ticks.pop();
  }
  return _.sortBy(ticks);
};

/**
 * Truncate the text in an svg text element to fit within a target width
 * @param {Object} svgTextEl - svg text element
 * @param {Object} targetWidth - maximum width of rendered text
 * @param {Object} disemvowel - remove vowels inside words to assist in shortening, optional, default true
 */
export const truncateTextToWidth = (svgTextEl, targetWidth, disemvowel = false) => {
  const d3elem = d3.select(svgTextEl);
  let numberOfCharacters = d3elem.text().length;
  if (disemvowel) {
    while (stringUtil.containsInternalVowel(d3elem.text()) && svgTextEl.getComputedTextLength() > targetWidth && numberOfCharacters > 0) {
      d3elem.text(stringUtil.dropOneInternalVowel(d3elem.text()));
      numberOfCharacters = d3elem.text().length;
    }
  }
  do {
    d3elem.text(stringUtil.truncateString(d3elem.text(), numberOfCharacters--));
  } while (svgTextEl.getComputedTextLength() > targetWidth && numberOfCharacters > 0);
};


export const hideSvgTooltip = (svgContainer) => {
  if (svgContainer === null || svgContainer.node() === null) return;
  svgContainer.selectAll('.svg-tooltip').remove();
};

/**
 * Appends a nice tooltip to the svg at the position requested
 * @param {Object} svgContainer - the svg element where the tooltip is removed/appended
 * @param {String} text - the text inside the tooltip - can include \n, will word wrap
 * @param {Object} position - [x,y] array, svg coordinates where the tooltip will point at
 * @param {Number} preferredAngle - radians direction the tooltip will point (default -PI/2 = pointing down, tooltip above), can be adjusted if the tooltip doesn't fit
 * @param {Bool} flexPosition - allow the tooltip to adjust it's position based on if it fits within the bbox of it's container element
 */
export const showSvgTooltip = (svgContainer, text, position, preferredAngle = -Math.PI / 2, flexPosition = false) => {
  if (svgContainer === null || svgContainer.node() === null) { console.log('svgContainer is null\n'); return; }

  let angle = (_.isNumber(preferredAngle)) ? preferredAngle : -Math.PI / 2; // points down (tooltip above)

  hideSvgTooltip(svgContainer);

  const originalBBox = svgContainer.node().getBBox();

  const padding = 10;
  const lineSpacing = 13;

  const svgTooltip = svgContainer.append('g')
    .classed('svg-tooltip', true)
    .attr('transform', translate(...position))
    .style('pointer-events', 'none')
    .style('opacity', '1');

  // add arrow first so that it's behind background-rect and text
  const svgTooltipArrow = svgTooltip
    .append('polygon')
    .attr('points', [
      [padding, 0],
      [padding * 2, -padding * 0.5],
      [padding * 2, padding * 0.5]
    ].join(' '));

  const svgTooltipContents = svgTooltip
    .append('g');

  const svgTooltipRect = svgTooltipContents
    .append('rect')
    .style('rx', '4px');

  const svgTooltipText = svgTooltipContents
    .append('text')
    .style('font-size', '12px')
    .style('fill', 'white');

  const tspans = String(text).replace(/<br \/>/g, '\n').split('\n')
    .map(line => svgTooltipText.append('tspan').text(line).node());

  const svgTooltipTextWidth = Math.round(Math.max(...tspans.map(tspan => tspan.getComputedTextLength())) + padding * 2);
  const svgTooltipTextHeight = lineSpacing * tspans.length + padding * 2;

  tspans.forEach((tspan, i) => {
    d3.select(tspan)
      .attr('x', (svgTooltipTextWidth - tspan.getComputedTextLength()) / 2)
      .attr('y', i * lineSpacing + padding * 2);
  });

  svgTooltipRect
    .attr('width', svgTooltipTextWidth)
    .attr('height', svgTooltipTextHeight);

  const offset = [
    (Math.cos(angle) * (svgTooltipTextWidth * 0.5 + padding * 1.75)),
    (Math.sin(angle) * (svgTooltipTextHeight * 0.5 + padding * 1.75))
  ];

  // move tooltip into place and see if it affects the bbox of the container
  svgTooltipContents.attr('transform', translate(offset[0] + (svgTooltipTextWidth * -0.5), offset[1] + (svgTooltipTextHeight * -0.5)));

  // if adding this tooltip changed the BBox, move the tooltip to adjust accordingly
  if (flexPosition === true) {
    const newBBox = svgContainer.node().getBBox();

    if (newBBox.x < originalBBox.x) {
      offset[0] += (originalBBox.x - newBBox.x);
    } else if (newBBox.width > originalBBox.width) {
      offset[0] -= svgTooltipTextWidth + padding * 3.5;
    }

    if (newBBox.y < originalBBox.y) {
      offset[1] += (originalBBox.y - newBBox.y);
    } else if (newBBox.height > originalBBox.height) {
      offset[1] -= (newBBox.height - originalBBox.height);
    }
  }

  // re-angle that angle (the arrow)
  angle = Math.atan2(offset[1], offset[0]);

  svgTooltipContents.attr('transform', translate(offset[0] + (svgTooltipTextWidth * -0.5), offset[1] + (svgTooltipTextHeight * -0.5)));
  svgTooltipArrow.attr('transform', 'rotate(' + (angle / Math.PI * 180) + ')');
};

/**
 * Get closest point on an svg path, copied from: https://bl.ocks.org/mbostock/8027637
 * @param {Object} pathNode - svg path node
 * @param {Object} point - position, for example mouse position [x,y]
 */
export function closestPointOnPath(pathNode, point) {
  if (pathNode === null || pathNode.getTotalLength() === 0.0) { return point; }
  const pathLength = pathNode.getTotalLength();
  let precision = 8;
  let best;
  let bestLength;
  let bestDistance = Infinity;

  // linear scan for coarse approximation
  for (let scan, scanLength = 0, scanDistance; scanLength <= pathLength; scanLength += precision) {
    if ((scanDistance = distance2(scan = pathNode.getPointAtLength(scanLength))) < bestDistance) {
      best = scan;
      bestLength = scanLength;
      bestDistance = scanDistance;
    }
  }

  // binary search for precise estimate
  precision /= 2;
  while (precision > 0.5) {
    let before,
      after,
      beforeLength,
      afterLength,
      beforeDistance,
      afterDistance;
    if ((beforeLength = bestLength - precision) >= 0 && (beforeDistance = distance2(before = pathNode.getPointAtLength(beforeLength))) < bestDistance) {
      best = before;
      bestLength = beforeLength;
      bestDistance = beforeDistance;
    } else if ((afterLength = bestLength + precision) <= pathLength && (afterDistance = distance2(after = pathNode.getPointAtLength(afterLength))) < bestDistance) {
      best = after;
      bestLength = afterLength;
      bestDistance = afterDistance;
    } else {
      precision /= 2;
    }
  }

  best = [best.x, best.y];
  best.lengthAlongPath = bestLength;
  best.percentageAlongPath = bestLength / pathLength;
  best.distanceToPath = Math.sqrt(bestDistance);
  return best;

  function distance2(p) {
    const dx = p.x - point[0];
    const dy = p.y - point[1];
    return dx * dx + dy * dy;
  }
}


// Pre-canned path/glyphs, we assume all paths are bounded by a 10x10 grid and centered at (0, 0)
// - Arrows point left-to-right
export const MARKER_VIEWBOX = '-5 -5 10 10';
export const ARROW = 'M 0,-3.25 L 5 ,0 L 0,3.25';
export const ARROW_WIDTH = 6.5;
export const ARROW_LENGTH = 5;
export const ARROW_SHARP = 'M 0,-3 L 5 ,0 L 0,3 L 1 0';

export default {
  createChart,
  translate,
  arc,
  line,
  wrapText,
  addCrosshairTooltip,
  pathFn,
  getTranslateFromSVGTransform,

  // FIXME: Projections, may want to move to own space
  timeseriesLine,
  timeseriesArea,
  confidenceArea,

  calculateTicks,

  truncateTextToWidth,

  hideSvgTooltip,
  showSvgTooltip,

  closestPointOnPath,

  MARKER_VIEWBOX,
  ARROW,
  ARROW_SHARP
};
