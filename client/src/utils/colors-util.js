
import {
  quantize,
  interpolateRgb,
  interpolateTurbo
} from 'd3';

/**
 * Enum for color names.
 * @readonly
 * @enum {string}
 */
export const COLOR = Object.freeze({
  WM_GREEN: 'WM_GREEN',
  WM_RED: 'WM_RED',
  WM_BLUE: 'WM_BLUE',
  TURBO: 'TURBO'
});

const COLOR_SCALES = Object.freeze({
  WM_GREEN: interpolateRgb('#f7fcb9', '#31a354'), // sequential color band Source: http://colorbrewer2.org/#type=sequential&scheme=YlGn&n=3;
  WM_RED: interpolateRgb('#fee8c8', '#e34a33'),
  WM_BLUE: interpolateRgb('#f7fbff', '#3182bd'),
  TURBO: interpolateTurbo
});

export const COLOR_SCHEME = Object.freeze({
  WM_GREEN: getColors(COLOR.WM_GREEN, 2)
});

export const UNDEFINED_COLOR = '#000000';
export const GRAPH_BACKGROUND_COLOR = '#FFFFFF';
export const INTERVENTION_COLOR = '#4b0082';
export const SELECTED_COLOR = '#56b3e9';
export const SELECTED_COLOR_DARK = '#1673aa'; // For svg text
export const SELECTED_COLOR_RGBA = 'rgb(86, 180, 233, .1)'; // For overlays
export const BORDER_COLOR = '#ccc';
export const TIME_SERIES_COLOR = '#cce5df'; // FIXME: remove, not used
export const DEFAULT_COLOR = '#4C7079';
export const FADED_COLOR = '#D6DBDF';
export const MARKER_COLOR = '#d55c00';


export const EDGE_COLOR_PALETTE = ['#d55e00', '#6b6859', '#0072b2']; // https://www.nature.com/articles/nmeth.1618/figures/2

/**
 * Get n uniformly spaced colors for given color name
 * @param {COLOR} colorName - color name
 */
export function getColors(colorName, n = 256) {
  return quantize(getColorScale(colorName), n);
}

/**
 * Return [0, 1] color scale function for given color
 * @param {COLOR} colorName - color name
 */
export function getColorScale(colorName) {
  const scale = COLOR_SCALES[colorName];
  if (!scale) throw new Error(`${colorName} is not supported color`);
  return COLOR_SCALES[colorName];
}

export default {
  COLOR_SCHEME,
  INTERVENTION_COLOR,
  SELECTED_COLOR,
  BORDER_COLOR,
  DEFAULT_COLOR,
  FADED_COLOR,
  TIME_SERIES_COLOR,
  MARKER_COLOR,
  UNDEFINED_COLOR
};
