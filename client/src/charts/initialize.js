import { translate } from '@/utils/svg-util';

/**
 * Initialize the basic transform and returns the render group element and
 * dimension specification. There are primarily two cases:
 *
 * 1. Rendering into a <g> element, here the calculations are normal - transform according
 * to the margin spec and return a child <g> for rendering.
 *
 * 2.1 Rendering into a <svg> element with width/height - width and height are applied as
 * svg-attributes in pixels, in addition a viewbox is applied.
 *
 * 2.2. Rendering into a <svg> element without width/height - assumes whatever dimension is
 * available and applies viewbox.
 *
 * @param {object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {object} options.margin
 * @param {number} options.margin.top
 * @param {number} options.margin.bottom
 * @param {number} options.margin.left
 * @param {number} options.margin.right
 * @param {object} options.viewport
 * @param {number} options.viewport.x1 - left
 * @param {number} options.viewport.y1 - top
 * @param {number} options.viewport.x2 - right
 * @param {number} options.viewport.y2 - bottom
 */
const initialize = (selection, options) => {
  const selectionConstructor = selection.node().constructor;

  if (selectionConstructor === SVGGElement) {
    const g = selection
      .append('g')
      .attr('transform', translate(options.margin.left, options.margin.top));

    return {
      g: g,
      x1: options.margin.left,
      y1: options.margin.top,
      x2: options.width - options.margin.right,
      y2: options.height - options.margin.bottom,
    };
  } else if (selectionConstructor === SVGSVGElement) {
    if (options.width && options.height) {
      selection.attr('width', options.width + 'px');
      selection.attr('height', options.height + 'px');
    }
    selection.attr('preserveAspectRatio', 'xMinYMin meet');
    const x1 = options.viewport.x1;
    const y1 = options.viewport.y1;
    const x2 = options.viewport.x2 - options.viewport.x1;
    const y2 = options.viewport.y2 - options.viewport.y1;
    selection.attr('viewBox', `${x1} ${y1} ${x2} ${y2}`);

    const g = selection
      .append('g')
      .attr('transform', translate(options.margin.left, options.margin.top));

    return {
      g: g,
      x1: options.viewport.x1 + options.margin.left,
      y1: options.viewport.y1 + options.margin.top,
      x2: options.viewport.x2 - options.margin.right,
      y2: options.viewport.y2 - options.margin.bottom,
    };
  } else {
    throw new Error(`Unable to initialize render context in ${selectionConstructor}`);
  }
};

export default initialize;
