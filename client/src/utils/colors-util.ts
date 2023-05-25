import * as d3 from 'd3';

export enum COLOR {
  GREYS_7 = 'GREYS_7',
  PIYG_7 = 'PIYG_7',
  RDYLBU_7 = 'DIVERGING',
  DEFAULT = 'DEFAULT',
  VEGETATION = 'VEGETATION',
  WATER = 'WATER',
  PRIORITIZATION = 'PRIORITIZATION',

  OTHER = 'OTHER',
}

export const COLOR_SCHEME: { [key in COLOR]: string[] } = Object.freeze({
  [COLOR.GREYS_7]: ['#f7f7f7', '#d9d9d9', '#bdbdbd', '#969696', '#737373', '#525252', '#252525'], // https://colorbrewer2.org/?type=sequential&scheme=Greys&n=7
  [COLOR.PIYG_7]: ['#c51b7d', '#e9a3c9', '#fde0ef', '#f7f7f7', '#e6f5d0', '#a1d76a', '#4d9221'], // https://colorbrewer2.org/#type=diverging&scheme=PiYG&n=7
  [COLOR.RDYLBU_7]: ['#d73027', '#fc8d59', '#fee090', '#ffffbf', '#e0f3f8', '#91bfdb', '#4575b4'], // https://colorbrewer2.org/#type=diverging&scheme=RdYlBu&n=7
  [COLOR.DEFAULT]: ['#f2f0f7', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#4a1486'],
  [COLOR.VEGETATION]: ['#edf8e9', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#005a32'],
  [COLOR.WATER]: ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'],
  [COLOR.PRIORITIZATION]: [
    '#ffeda0',
    '#fed976',
    '#feb24c',
    '#fd8d3c',
    '#fc4e2a',
    '#e31a1c',
    '#bd0026',
    '#800026',
  ],
  [COLOR.OTHER]: ['#feedde', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#8c2d04'],
});

export const COLOR_PALETTE_SIZE = 256;

export const UNDEFINED_COLOR = '#000000';
export const GRAPH_BACKGROUND_COLOR = '#FFFFFF';
export const SELECTED_COLOR = '#8858e9';
export const SELECTED_COLOR_DARK = '#5f4398'; // For svg text
export const SELECTED_COLOR_RGBA = 'rgb(136, 88, 233, .1)'; // For overlays
export const BORDER_COLOR = '#ccc';
export const DEFAULT_COLOR = '#4C7079';
export const FADED_COLOR = '#D6DBDF';
export const MARKER_COLOR = '#d55c00';

export const POSITIVE_COLOR = '#0072b2';
export const NEGATIVE_COLOR = '#d55e00';

export const EDGE_COLOR_PALETTE = ['#d55e00', '#6b6859', '#0072b2']; // https://www.nature.com/articles/nmeth.1618/figures/2

/**
 * Get n uniformly spaced colors for given color name
 * @param {COLOR} color - color name
 */
export function getColors(color: COLOR, n = COLOR_PALETTE_SIZE) {
  const scheme = COLOR_SCHEME[color];
  if (n === 1) return [scheme[scheme.length - 1]];
  return d3.quantize(d3.interpolateRgbBasis(COLOR_SCHEME[color]), n);
}

/**
 * return canvas representing continuous color ramp
 * @param color color interpolator
 * @param n number of colors
 * @returns canvas that represent continuous color ramp
 */
export function ramp(color: (t: number) => string, n = COLOR_PALETTE_SIZE) {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = n;
  const context = canvas.getContext('2d');
  if (!context) return;
  for (let i = 0; i < n; ++i) {
    context.fillStyle = color(i / (n - 1));
    context.fillRect(0, n - i, 1, 1);
  }
  return canvas;
}

export const COLORS = ['#8767C8', '#1b9e77', '#d95f02', '#e7298a', '#66a61e'];

export function colorFromIndex(index: number) {
  return COLORS[index % COLORS.length];
}

export enum ColorScaleType {
  Linear = 'linear',
  Log = 'log',
  LinearDiscrete = 'linear discrete',
  LogDiscrete = 'log discrete',
}
export function validateColorScaleType(val: string) {
  return Object.values(ColorScaleType).includes(val as ColorScaleType);
}

export const DISCRETE_SCALES = [ColorScaleType.LinearDiscrete, ColorScaleType.LogDiscrete];

export const DIVERGING_SCALES = [COLOR.PIYG_7, COLOR.RDYLBU_7];

export const SCALE_FUNCTION = {
  [ColorScaleType.Linear]: d3.scaleLinear,
  [ColorScaleType.Log]: d3.scaleSymlog,
  [ColorScaleType.LinearDiscrete]: d3.scaleLinear,
  [ColorScaleType.LogDiscrete]: d3.scaleSymlog,
};

export function isDiscreteScale(scaleType: ColorScaleType) {
  return Boolean(DISCRETE_SCALES.find((v) => v === scaleType));
}

export function isDivergingScheme(schemeName: COLOR) {
  return DIVERGING_SCALES.includes(schemeName);
}

export default {
  COLORS,
  ColorScaleType,
  COLOR_SCHEME,
  SELECTED_COLOR,
  BORDER_COLOR,
  DEFAULT_COLOR,
  FADED_COLOR,
  MARKER_COLOR,
  UNDEFINED_COLOR,
};
