import * as d3 from 'd3';
import _ from 'lodash';
import * as vsup from 'vsup';
import { EDGE_COLOR_PALETTE, UNDEFINED_COLOR } from '@/utils/colors-util';

export const COLOR_MAP = Object.freeze({
  RED: '#d7191c',
  LIGHT_RED: '#fdae61',
  YELLOW: '#ffffbf',
  LIGHT_GREEN: '#a6d96a',
  GREEN: '#1a9641',
  GRAY: '#bdc3c7',
});

export const nodeBlurScale = d3.scaleLinear().domain([0, 1]).range([15, 0]);
export const nodeColorScale = d3.scaleSequential(d3.interpolateGreys);

// FIXME: This is weird, we should be able to use a domain [0, 0.5, 1]. We need to re-evaluate if we need to keep using VSUP or if we can build it ourselves.
const edgeColorScale = d3
  .scaleLinear()
  .domain([0.15, 0.5, 0.85])
  .range(EDGE_COLOR_PALETTE)
  .interpolate(d3.interpolateLab);
/**
 * Wrapper to create a linear scale
 * @param {array} domain - data domtain in [min, max]
 * @param {array} range - destination range in [min, max]
 */
export function createLinearScale(domain, range) {
  return d3.scaleLinear().domain(domain).range(range).clamp(true);
}

export function createVSUPscale() {
  const uDom = [1, 0]; // Belief score goes from 0 to 1 but we need to do it reversed in this case
  const vDom = [-1, 1]; // Divergent scale for polarities

  const quantization = vsup.squareQuantization().n(3).valueDomain(vDom).uncertaintyDomain(uDom);
  const scale = vsup.scale().quantize(quantization).range(edgeColorScale); // 'us' de-saturates colors as uncertainty increases / 'ul' lightens colors as uncerainty increases

  return scale;
}

export function calcEdgeColor(edge) {
  const colorScale = createVSUPscale();
  const belief = edge.belief_score;
  if (edge.polarity === 0 && edge.unknown === 0 && edge.opposite === 0 && edge.same === 0) {
    return UNDEFINED_COLOR;
  } else if (!_.isNil(edge.polarity)) {
    return colorScale(edge.polarity, belief);
  } else if (edge.unknown > 0 || (edge.opposite > 0 && edge.same > 0)) {
    return colorScale(0, belief).toString();
  } else if (edge.same > edge.opposite) {
    return colorScale(1, belief).toString(); // Needed to convert the output from vsup to string for cytoscape
  } else if (edge.opposite > edge.same) {
    return colorScale(-1, belief).toString();
  }
  return UNDEFINED_COLOR;
}

/**
 * Use weights array to scale the edge width
 *
 * @param {number} baseWidth base-width
 * @param {EdgeParameter} edgeParameter
 */
export function scaleByWeight(baseWidth, edgeParameter) {
  const w = _.get(edgeParameter, 'parameter.weights', [0.5, 0.5]);
  if (w.length === 0) {
    // Stale edges
    return 0.25 * baseWidth;
  }
  if (w[0] === 0) {
    return 2 + baseWidth * w[1];
  } else {
    return 2 + baseWidth * w[0];
  }
}
