import * as d3 from 'd3';
import { COLOR } from '@/utils/colors-util';

export const DEFAULT_MODEL_OUTPUT_COLOR_OPTION = {
  color: COLOR.WM_RED,
  scaleFn: d3.scaleLinear
};

// Maximum precision of sub tiles for each model output
// Just add 5 to the zoom level at where sub tile (cell) starts to break on the map.
// Eg. drought model output starts to break at zoom level 5, so, set max precision to 10
export const modelOutputMaxPrecision = Object.freeze({
  // Old models
  'g-range': 10,
  'consumption_model': 14,
  'asset_wealth_model': 14,
  'malnutrition_model': 15,
  'pihm': 16,
  'lpjml': 9,
  'apsim': 10,
  'lpjml_historic': 10,
  'flood_index_model': 11,
  'market_price_model': 11,
  'dssat': 12,

  'chirps': 99,
  'clem': 99,
  'cropland_model': 99,
  'fsc': 99,
  'multi_twist': 99,
  'population_model': 99,
  'world_population_africa': 99,
  'yield_anomalies_lpjml': 99

  // New models
  // TODO: Figure out max precision for each model and add them here.
});
