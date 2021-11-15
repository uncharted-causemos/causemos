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
export const COLOR: { [key: string]: string } = Object.freeze({
  WM_GREEN: 'WM_GREEN',
  WM_RED: 'WM_RED',
  WM_BLUE: 'WM_BLUE',
  TURBO: 'TURBO'
});

const COLOR_SCALES: { [key: string]: (v: number) => string } = Object.freeze({
  WM_GREEN: interpolateRgb('#f7fcb9', '#31a354'), // sequential color band Source: http://colorbrewer2.org/#type=sequential&scheme=YlGn&n=3;
  WM_RED: interpolateRgb('#fee8c8', '#e34a33'),
  WM_BLUE: interpolateRgb('#f7fbff', '#3182bd'),
  TURBO: interpolateTurbo
});

export const COLOR_SCHEME = Object.freeze({
  GREYS_7: ['#f7f7f7', '#d9d9d9', '#bdbdbd', '#969696', '#737373', '#525252', '#252525'], // https://colorbrewer2.org/?type=sequential&scheme=Greys&n=7
  PIYG_7: ['#c51b7d', '#e9a3c9', '#fde0ef', '#f7f7f7', '#e6f5d0', '#a1d76a', '#4d9221'] // https://colorbrewer2.org/#type=diverging&scheme=PiYG&n=7
});

// All colors generated as single-hue palettes from:
// https://colorbrewer2.org
export const COLOR_SCHEMES = Object.freeze({
  DEFAULT: ['#f2f0f7', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#4a1486'],
  VEGETATION: ['#edf8e9', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32'],
  WATER: ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'],
  OTHER: ['#feedde', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#8c2d04']
});

export const UNDEFINED_COLOR = '#000000';
export const GRAPH_BACKGROUND_COLOR = '#FFFFFF';
export const SELECTED_COLOR = '#56b3e9';
export const SELECTED_COLOR_DARK = '#1673aa'; // For svg text
export const SELECTED_COLOR_RGBA = 'rgb(86, 180, 233, .1)'; // For overlays
export const BORDER_COLOR = '#ccc';
export const DEFAULT_COLOR = '#4C7079';
export const FADED_COLOR = '#D6DBDF';
export const MARKER_COLOR = '#d55c00';


export const EDGE_COLOR_PALETTE = ['#d55e00', '#6b6859', '#0072b2']; // https://www.nature.com/articles/nmeth.1618/figures/2

/**
 * Get n uniformly spaced colors for given color name
 * @param {COLOR} colorName - color name
 */
export function getColors(colorName: string, n = 256) {
  return quantize(getColorScale(colorName), n);
}

/**
 * Return [0, 1] color scale function for given color
 * @param {COLOR} colorName - color name
 */
export function getColorScale(colorName: string) {
  const scale = COLOR_SCALES[colorName];
  if (!scale) throw new Error(`${colorName} is not supported color`);
  return COLOR_SCALES[colorName];
}


const COLORS = [
  '#8767C8',
  '#1b9e77',
  '#d95f02',
  '#e7298a',
  '#66a61e'
];

export function colorFromIndex(index: number) {
  return COLORS[index % COLORS.length];
}

export enum ColorScaleType {
  Linear = 'linear',
  Discrete = 'discrete',
  Log = 'log'
}

export default {
  ColorScaleType,
  COLOR_SCHEME,
  COLOR_SCHEMES,
  SELECTED_COLOR,
  BORDER_COLOR,
  DEFAULT_COLOR,
  FADED_COLOR,
  MARKER_COLOR,
  UNDEFINED_COLOR
};
