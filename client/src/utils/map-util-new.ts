import _ from 'lodash';
import * as d3 from 'd3';
import { OutputStatsResult, RegionalAggregations, RawOutputDataPoint } from '@/types/Outputdata';
import {
  AnalysisMapColorOptions,
  AnalysisMapStats,
  BoundingBox,
  MapLayerStats,
  MapLegendColor,
} from '@/types/Common';
import { calculateDiff } from '@/utils/value-util';
import {
  isSelectionEmpty,
  isRegionSelected,
  stringToAdminLevel,
  REGION_ID_DELIMETER,
} from '@/utils/admin-level-util';
import { getBboxFromRegionIds } from '@/services/geo-service';
import { AdminRegionSets } from '@/types/Datacubes';
import { DiscreteOuputScale } from '@/types/Enums';
import { MapDisplayOptions } from '@/types/Datacube';
import {
  COLOR_PALETTE_SIZE,
  COLOR_SCHEME,
  ColorScaleType,
  SCALE_FUNCTION,
  getColorScheme,
  isDiscreteScale,
  isDivergingScheme,
} from './colors-util';

// This is the name of a special property added to regional data when "split by region" is active.
// It stores the value of the region that is being used as the comparison baseline and is used in
//  the map and bar chart panel to calculate the relative values that should be displayed.
export const BASELINE_VALUE_PROPERTY = '_baseline';

export const BOUNDS_GLOBAL: BoundingBox = [
  [-180, -90],
  [180, 90],
]; // [[minLng, minLat], [maxLng, maxLat]]

export enum BASE_LAYER {
  SATELLITE = 'satellite',
  DEFAULT = 'default',
}

export enum DATA_LAYER_TRANSPARENCY {
  '0%' = '0',
  '25%' = '0.25',
  '50%' = '0.5',
  '75%' = '0.75',
  '100%' = '1',
}

export enum DATA_LAYER {
  ADMIN = 'admin',
  TILES = 'tiles',
  RAW = 'dot',
}

export enum SOURCE_LAYER {
  // Note: Vector tile source data for each layer (we currently have 4 different vector data source)
  // has to be referenced by following ids, 'boundaries-adm0' to 'boundaries-adm3' and `maas`.
  // For example, grid vector tile data has a single layer with id `maas` and the layer data can be referenced by `maas`
  // We don't use vector tile for points data (since data is provided by geojson), so `points` is just a made up id.
  COUNTRY = 'boundaries-adm0',
  ADMIN1 = 'boundaries-adm1',
  ADMIN2 = 'boundaries-adm2',
  ADMIN3 = 'boundaries-adm3',
  GRID = 'maas',
  POINTS = 'points',
}
export const SOURCE_LAYERS = [
  {
    layerId: SOURCE_LAYER.COUNTRY,
    sourceBaseUrl: 'api/maas/tiles/cm-boundaries-adm0/{z}/{x}/{y}',
  },
  {
    layerId: SOURCE_LAYER.ADMIN1,
    sourceBaseUrl: 'api/maas/tiles/cm-boundaries-adm1/{z}/{x}/{y}',
  },
  {
    layerId: SOURCE_LAYER.ADMIN2,
    sourceBaseUrl: 'api/maas/tiles/cm-boundaries-adm2/{z}/{x}/{y}',
  },
  {
    layerId: SOURCE_LAYER.ADMIN3,
    sourceBaseUrl: 'api/maas/tiles/cm-boundaries-adm3/{z}/{x}/{y}',
  },
  {
    layerId: SOURCE_LAYER.GRID,
    sourceBaseUrl: 'api/maas/tiles/grid-output/{z}/{x}/{y}',
  },
  {
    layerId: SOURCE_LAYER.POINTS, // dummy layer for the points data which will be provided as geojson
    sourceBaseUrl: '',
  },
];

export function getSourceLayerById(layerId: SOURCE_LAYER) {
  return SOURCE_LAYERS.find((l) => l.layerId === layerId) || SOURCE_LAYERS[0];
}

export function getMapSourceLayer(dataLayer: DATA_LAYER, adminLevel = 0) {
  const adminSourceLevels = [
    SOURCE_LAYER.COUNTRY,
    SOURCE_LAYER.ADMIN1,
    SOURCE_LAYER.ADMIN2,
    SOURCE_LAYER.ADMIN3,
  ];
  switch (dataLayer) {
    case DATA_LAYER.ADMIN:
      return getSourceLayerById(adminSourceLevels[adminLevel]);
    case DATA_LAYER.TILES:
      return getSourceLayerById(SOURCE_LAYER.GRID);
    case DATA_LAYER.RAW:
      return getSourceLayerById(SOURCE_LAYER.POINTS);
    default:
      return getSourceLayerById(adminSourceLevels[adminLevel]);
  }
}

// Resolve edge case where min and max are equal. Often happens when there's single data point when calculating min/max
// Eg. Region data only has Ethiopia at country level.
function resolveSameMinMaxValue({ min, max }: { min: number; max: number }) {
  if (min === 0 && max === 0) {
    return { min: -1, max: 1 };
  }
  const result = { min, max };
  if (min === max) {
    result[Math.sign(result.min) === -1 ? 'max' : 'min'] = 0;
  }
  return result;
}

// Iterate over all stats for all level and resolve the same min/max for each range. Same min max often happens when there's single data point when calculating min/max.
// Eg. When region data only has Ethiopia at country level.
export function resolveSameMinMaxMapStats(analysisMapStats: AnalysisMapStats) {
  const stats = _.cloneDeep(analysisMapStats);
  Object.values(stats).forEach((layerStats: MapLayerStats) => {
    for (const [level, stat] of Object.entries(layerStats)) {
      layerStats[level] = resolveSameMinMaxValue(stat);
    }
  });
  return stats;
}

function isNoneRegionId(regionId: string) {
  const tokens = regionId.split(REGION_ID_DELIMETER);
  return tokens.reduce((prev, cur) => prev && cur === 'None', true);
}

export function getActiveRegions(regionalData: RegionalAggregations, selection: AdminRegionSets) {
  const result: RegionalAggregations = {
    country: [],
    admin1: [],
    admin2: [],
    admin3: [],
  };
  for (const [key, data] of Object.entries(regionalData)) {
    const isAllSelected = isSelectionEmpty(selection, stringToAdminLevel(key), true);
    result[key as keyof RegionalAggregations] = (data || []).filter((agg) => {
      const isSelected = isAllSelected || isRegionSelected(selection, agg.id, true);
      return isSelected && !isNoneRegionId(agg.id);
    });
  }
  return result;
}

// Compute min/max stats for regional data
export function computeRegionalStats(
  regionData: RegionalAggregations,
  baselineProp: string | null,
  showPercentChange: boolean
): AnalysisMapStats {
  const globalStats: MapLayerStats = {};
  // Stats globally across all runs
  for (const [key, data] of Object.entries(regionData)) {
    const values = [];
    for (const v of data || []) {
      values.push(...Object.values(_.omit(v.values, BASELINE_VALUE_PROPERTY)));
    }
    if (values.length) {
      globalStats[key] = { min: Math.min(...values), max: Math.max(...values) };
    }
  }
  const baseline: MapLayerStats = {};
  const difference: MapLayerStats = {};
  if (baselineProp) {
    // Stats for the baseline run for each admin level
    for (const [key, data] of Object.entries(regionData)) {
      const values = (data || [])
        .filter((v) => v.values[baselineProp] !== undefined)
        .map((v) => v.values[baselineProp]);
      if (values.length) {
        baseline[key] = { min: Math.min(...values), max: Math.max(...values) };
      }
    }

    // Stats relative to the baseline. (min/max of the difference relative to the baseline)
    for (const [adminLevel, data] of Object.entries(regionData)) {
      const values: number[] = [];
      (data || []).forEach((v) => {
        const baselineValue = _.isFinite(v.values[baselineProp])
          ? v.values[baselineProp]
          : v.values[BASELINE_VALUE_PROPERTY];
        const diffs = Object.values(v.values).map((value) =>
          calculateDiff(baselineValue, value, showPercentChange)
        );
        values.push(...diffs.filter((v) => _.isFinite(v)));
      });
      if (values.length) {
        difference[adminLevel] = { min: Math.min(...values), max: Math.max(...values) };
      }
    }
  }
  return {
    global: globalStats,
    baseline,
    difference,
  };
}

export function computeGridLayerStats(
  gridOutputStats: OutputStatsResult[],
  baselineProp: string | null
): AnalysisMapStats {
  // NOTE: stat data is stored in the backend with subtile (grid cell) precision (zoom) level instead of the tile zoom level.
  // The difference is 6 so we subtract the difference to make the lowest level 0.
  const Z_DIFF = 6;
  const globalStats: MapLayerStats = {};
  const baseline: MapLayerStats = {};
  // Stats globally across all maps
  for (const item of gridOutputStats) {
    for (const stat of item.stats) {
      const zoom = stat.zoom - Z_DIFF;
      if (globalStats[zoom]) {
        globalStats[zoom] = resolveSameMinMaxValue({
          min: Math.min(globalStats[zoom].min, stat.min),
          max: Math.max(globalStats[zoom].max, stat.max),
        });
      } else {
        globalStats[zoom] = resolveSameMinMaxValue({ min: stat.min, max: stat.max });
      }
    }
  }
  if (baselineProp) {
    // Stats for the baseline map
    const stats = gridOutputStats.find((item) => item.outputSpecId === baselineProp)?.stats;
    (stats || []).forEach((stat) => {
      baseline[stat.zoom - Z_DIFF] = resolveSameMinMaxValue({ min: stat.min, max: stat.max });
    });
  }
  return {
    global: globalStats,
    baseline,
    difference: {},
  };
}

// Compute min/max stats for raw data
export function computeRawDataStats(data: RawOutputDataPoint[][]): AnalysisMapStats {
  const globalStats: MapLayerStats = {};
  const values = [];
  for (const d of data) {
    for (const p of d) {
      values.push(p.value);
    }
  }
  if (values.length) {
    globalStats.all = resolveSameMinMaxValue({
      min: Math.min(...values),
      max: Math.max(...values),
    });
  }
  return {
    global: globalStats,
    // baseline and difference is not applicable with raw data
    baseline: {},
    difference: {},
  };
}

export async function computeMapBoundsForCountries(regionIds: string[]) {
  if (!regionIds?.length) return null;
  return await getBboxFromRegionIds(regionIds);
}

export function popupFormatter(feature: { state: any }, includeNormalizedValue: boolean) {
  const { label, value, normalizedValue } = feature.state || {};
  if (!label || value === null || value === undefined) return null;
  return [
    label.split('__').pop(),
    includeNormalizedValue ? `Normalized: ${+normalizedValue.toFixed(2)}` : null,
    `Value: ${+value.toFixed(2)}`,
  ]
    .filter((x) => x !== null)
    .join('<br>');
}

// Split the domain into bins and return an array of numbers that represents the
//  boundaries between each bin.
export function createColorStops(
  domain: [number, number],
  colors: string[],
  scaleFn: Function
): number[] {
  const scale = scaleFn().domain(domain).range([0, 1]);
  const step = 1 / colors.length;
  const stops = colors.map((_, index) => {
    // Add a stop for the minimum value that this colour will be used for.
    return scale.invert(index * step);
  });
  // Add a stop for the maximum value (also ensures that we don't get a
  //  rounding error)
  stops.push(domain[1]);
  return stops;
}

/**
 * Produces an array of color stops to be used within a MapBox layer style color expression.
 *
 * For example, with [c1, v1, c2, v2, c3], colors will be mapped as following
 *     c1, when value is less than v1
 *     c2, when value is between v1 and v2
 *     c3, when value is greater than or equal to v2
 * @param domain the minimum and maximum values on the color scale
 * @param colors an array of hex codes in the order they should appear on the color scale
 * @param scaleFn controls how the colors should be spaced across the domain
 */
export function createColorStopsForLayerStyle(
  domain: [number, number],
  colors: string[],
  scaleFn: Function
) {
  const scale = scaleFn().domain(domain).range([0, 1]);
  const stops: string[] = [];
  const numColors = colors.length;
  const step = 1 / numColors;
  colors.forEach((color, index) => {
    stops.push(color);
    const i = index + 1;
    if (i < colors.length) stops.push(scale.invert(i * step));
  });
  return stops;
}

export function createDivergingColorStops(
  domain: [number, number],
  colors: string[],
  scaleFn: Function
): number[] {
  const absoluteMax = Math.max(...domain.map(Math.abs));
  const scale = scaleFn().domain([-absoluteMax, 0, absoluteMax]).range([-1, 0, 1]);
  const step = 2 / colors.length;
  const stops = colors.map((_, index) => {
    // Add a stop for the minimum value that this colour will be used for.
    return scale.invert(-1 + index * step);
  });
  // Add a stop for the maximum value (also ensures that we don't get a
  //  rounding error)
  stops.push(absoluteMax);
  return stops;
}

/**
 * Produces an array of color stops to be used within a MapBox layer style color expression.
 *
 * For example, with [c1, v1, c2, v2, c3], colors will be mapped as following
 *     c1, when value is less than v1
 *     c2, when value is between v1 and v2
 *     c3, when value is greater than or equal to v2
 *
 *
 * The min or max with the largest absolute value will be used to determine the color scale min and max.
 *
 * For example, a domain of [-8, 2] will produce a colour scale from -8 to +8.
 *
 * @param domain the minimum and maximum values in the data
 * @param colors an array of hex codes in the order they should appear on the color scale
 * @param scaleFn controls how the colors should be spaced across the domain
 */
export function createDivergingColorStopsForLayerStyle(
  domain: [number, number],
  colors: string[],
  scaleFn: Function
) {
  const max = Math.max(...domain.map(Math.abs));
  const scale = scaleFn().domain([-max, 0, max]).range([-1, 0, 1]);
  const stops: string[] = [];
  const numColors = colors.length;
  const step = 2 / numColors;
  colors.forEach((color, index) => {
    stops.push(color);
    const i = index + 1;
    if (i < colors.length) stops.push(scale.invert(i * step - 1));
  });
  return stops;
}

export const createMapLegendData = (
  domain: [number, number],
  colors: string[],
  scaleFn: Function,
  isDiverging: boolean
): MapLegendColor[] => {
  const stops = isDiverging
    ? createDivergingColorStops(domain, colors, scaleFn)
    : createColorStops(domain, colors, scaleFn);
  return colors.map((color, index) => {
    return { color, minLabel: stops[index], maxLabel: stops[index + 1] };
  });
};

export const createMapLegendDataWithDiscreteOutputScale = (
  domain: number[],
  colors: string[],
  scale: DiscreteOuputScale = DiscreteOuputScale.Quantize
): MapLegendColor[] => {
  let sc: d3.ScaleQuantize<string, never> | d3.ScaleQuantile<string, never> = d3.scaleQuantize(
    domain,
    colors
  );
  if (scale === DiscreteOuputScale.Quantile) {
    sc = d3.scaleQuantile(domain, colors);
  }
  return colors.map((c) => {
    const [min, max] = sc.invertExtent(c);
    return {
      color: c,
      minLabel: min,
      maxLabel: max,
    };
  });
};

export const getAnalysisMapColorOptionsFromMapDisplayOptions = (
  mapDisplayOptions: MapDisplayOptions
) => {
  const {
    numberOfColorBins,
    dataLayerTransparency,
    colorScaleType,
    colorSchemeName,
    colorSchemeReversed,
  } = mapDisplayOptions;
  const options: AnalysisMapColorOptions = {
    scheme: getColorScheme(colorScaleType, colorSchemeName, numberOfColorBins, colorSchemeReversed),
    relativeToSchemes: [COLOR_SCHEME.GREYS_7, COLOR_SCHEME.PIYG_7],
    scaleFn: SCALE_FUNCTION[colorScaleType as ColorScaleType],
    isContinuous: !isDiscreteScale(colorScaleType),
    isDiverging: isDivergingScheme(colorSchemeName),
    opacity: Number(dataLayerTransparency),
  };
  return options;
};

type MapboxGlExpression = (
  | string
  | (string | undefined)[]
  | (string | (string | undefined)[] | null)[]
)[];

export function diffExpr(
  oldValExpr: MapboxGlExpression,
  newValExpr: MapboxGlExpression,
  showPercentChange = false
) {
  if (showPercentChange) {
    return [
      'case',
      // Both zero, return 0
      ['all', ['==', 0, oldValExpr], ['==', 0, newValExpr]],
      0,
      // Otherwise, calculate the percentage
      ['*', ['/', ['-', newValExpr, oldValExpr], ['abs', oldValExpr]], 100],
    ];
  }
  return ['-', newValExpr, oldValExpr];
}

/**
 * @param {String} property - Name of the property for the geojson feature for applying color
 * @param {Array} dataDomain - Data domain in the form of [min, max]
 * @param {Array} colorScheme - Color scheme, list of colors
 * @param {Function} scaleFn - d3 scale function
 * @param {Boolean} useFeatureState - use feature state instead of a property
 */
export function colorExpr(
  property: string,
  domain: [number, number],
  colorScheme: string[],
  scaleFn: Function = d3.scaleLinear,
  useFeatureState = false,
  relativeTo?: string,
  showPercentChange = false,
  continuous = false,
  diverging = false
) {
  const colors = continuous
    ? d3.quantize(d3.interpolateRgbBasis(colorScheme), COLOR_PALETTE_SIZE)
    : colorScheme;

  const stops =
    !_.isNil(relativeTo) || diverging
      ? createDivergingColorStopsForLayerStyle(domain, colors, scaleFn)
      : createColorStopsForLayerStyle(domain, colors, scaleFn);
  const getter = useFeatureState ? 'feature-state' : 'get';
  const baselineValueExpr = [
    'case',
    ['!=', null, [getter, relativeTo]],
    [getter, relativeTo],
    [getter, BASELINE_VALUE_PROPERTY],
  ];
  const valueExpr = !_.isNil(relativeTo)
    ? diffExpr(baselineValueExpr, [getter, property], showPercentChange)
    : [getter, property];

  return ['step', valueExpr, ...stops];
  // return continuous
  //   ? [
  //     'interpolate',
  //     ['linear'],
  //     valueExpr,
  //     ...stops
  //   ]
  //   : [
  //     'step',
  //     valueExpr,
  //     ...stops
  //   ];
}

/**
 * Create a fill type mapbox layer style object for polygons
 *
 * @param {String} property - Name of the property for the geojson feature for applying color
 * @param {Array} dataDomain - Data domain in the form of [min, max]
 * @param {Array} filterDomain - Filter domain in the form of [min, max]
 * @param {Array} colorOptions - Color options
 * @param {Boolean} useFeatureState - use feature state instead of a property
 */
export const createHeatmapLayerStyle = (
  property: string,
  dataDomain: [number, number],
  filterDomain: { min: number; max: number },
  colorOptions: AnalysisMapColorOptions,
  useFeatureState = false,
  relativeTo?: string,
  showPercentChange = false
) => {
  const opacity = _.isNil(colorOptions.opacity) ? 1 : colorOptions.opacity;
  const style = {
    type: 'fill',
    paint: {
      'fill-antialias': false,
      'fill-color': colorExpr(
        property,
        dataDomain,
        colorOptions.scheme,
        colorOptions.scaleFn,
        useFeatureState,
        relativeTo,
        showPercentChange,
        colorOptions.isContinuous,
        colorOptions.isDiverging
      ),
      'fill-opacity': opacity,
    },
  } as any;
  if (useFeatureState) {
    // TODO: split this into two functions (one for feature state and one for grid map style)
    const missingProperty = [['==', null, ['feature-state', property]], 0.0] as any;
    !_.isNil(relativeTo) &&
      missingProperty.push(
        [
          'all',
          ['==', null, ['feature-state', relativeTo]],
          ['==', null, ['feature-state', BASELINE_VALUE_PROPERTY]],
        ],
        0.0
      );
    const baselineValueExpr = [
      'case',
      ['!=', null, ['feature-state', relativeTo]],
      ['feature-state', relativeTo],
      ['feature-state', BASELINE_VALUE_PROPERTY],
    ];
    const propertyGetter = _.isNil(relativeTo)
      ? ['feature-state', property]
      : diffExpr(baselineValueExpr, ['feature-state', property], showPercentChange);
    style.paint['fill-opacity'] = [
      'case',
      ...missingProperty,
      ['==', 'NaN', ['to-string', propertyGetter]],
      0.0,
      ['<', propertyGetter, filterDomain.min],
      0.0,
      ['>', propertyGetter, filterDomain.max],
      0.0,
      ['==', true, ['feature-state', '_isHidden']],
      0.0,
      opacity,
    ];

    // Add outline to better distinguish between neighbor polygons
    style.paint['fill-antialias'] = true; // Needs to be true for fill-outline-color
    style.paint['fill-outline-color'] = 'rgb(30, 30, 30)';
  }
  return style;
};
