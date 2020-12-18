import * as d3 from 'd3';
import _ from 'lodash';
import { COLOR } from '@/utils/colors-util';

export const MODEL_COLOR_OPTIONS = [
  {
    modelId: 'PIHM',
    outputVariable: 'surface water',
    color: COLOR.WM_BLUE,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'G-Range',
    outputVariable: 'herbage_prodn',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'G-Range',
    outputVariable: 'total_anomaly_herbage_prodn',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'G-Range',
    outputVariable: 'rel_anomaly_total_herbage_prodn',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'G-Range',
    outputVariable: 'herbage_anpp',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'G-Range',
    outputVariable: 'mean_anomaly_herbage_anpp',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'G-Range',
    outputVariable: 'rel_anomaly_mean_herbage_anpp',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'G-Range',
    outputVariable: 'total_area_rangeland',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'CLEM',
    outputVariable: 'sales',
    color: COLOR.WM_RED,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'CLEM',
    outputVariable: 'mean_stored_supply',
    color: COLOR.WM_RED,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'CLEM',
    outputVariable: 'demand',
    color: COLOR.WM_RED,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'CLEM',
    outputVariable: 'percent_cereal_reqt_from_farm',
    color: COLOR.WM_RED,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'APSIM',
    outputVariable: 'production',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'APSIM',
    outputVariable: 'area',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'APSIM',
    outputVariable: 'yield',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'APSIM',
    outputVariable: 'yield_anomaly',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'APSIM',
    outputVariable: 'production_anomaly',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'DSSAT',
    outputVariable: 'HWAH',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'DSSAT',
    outputVariable: 'HARVEST_AREA',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'DSSAT',
    outputVariable: 'Production',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'CHIRPS',
    outputVariable: 'Rainfall',
    color: COLOR.WM_BLUE,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'CHIRPS',
    outputVariable: 'Rainfall relative to average',
    color: COLOR.WM_BLUE,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'malnutrition_model',
    outputVariable: 'malnutrition cases',
    color: COLOR.WM_RED,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'population_model',
    outputVariable: 'population',
    color: COLOR.WM_RED,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'lpjml_historic',
    outputVariable: 'production',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'lpjml',
    outputVariable: 'production',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'yield_anomalies_lpjml',
    outputVariable: 'yield level',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleLinear
  },
  {
    modelId: 'flood_index_model',
    outputVariable: 'days_severe',
    color: COLOR.WM_BLUE,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'flood_index_model',
    outputVariable: 'days_high',
    color: COLOR.WM_BLUE,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'flood_index_model',
    outputVariable: 'days_medium',
    color: COLOR.WM_BLUE,
    scaleFn: d3.scaleSymlog
  },
  {
    modelId: 'cropland_model',
    outputVariable: 'cropland',
    color: COLOR.WM_GREEN,
    scaleFn: d3.scaleLinear
  }
];

export const DEFAULT_MODEL_OUTPUT_COLOR_OPTION = {
  color: COLOR.WM_RED,
  scaleFn: d3.scaleLinear
};

export const getModelOutputColorOption = (modelId, outputVariable) => {
  return {
    ...DEFAULT_MODEL_OUTPUT_COLOR_OPTION,
    ..._.find(MODEL_COLOR_OPTIONS, { modelId, outputVariable })
  };
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
