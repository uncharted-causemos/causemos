import _ from 'lodash';
import { OutputStatsResult, RegionalAggregations, RawOutputDataPoint } from '@/types/Outputdata';
import { AnalysisMapStats, MapLayerStats } from '@/types/Common';
import { calculateDiff } from '@/utils/value-util';
import { isSelectionEmpty, isRegionSelected, stringToAdminLevel, REGION_ID_DELIMETER } from '@/utils/admin-level-util';
import { getBboxFromRegionIds } from '@/services/geo-service';
import { AdminRegionSets } from '@/types/Datacubes';

export enum BASE_LAYER {
  SATELLITE = 'satellite',
  DEFAULT = 'default'
}

export enum DATA_LAYER_TRANSPARENCY {
  '0%' = '0',
  '25%' = '0.25',
  '50%' = '0.5',
  '75%' = '0.75',
  '100%' = '1'
}

export enum DATA_LAYER {
  ADMIN = 'admin',
  TILES = 'tiles',
  RAW = 'dot'
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
  POINTS = 'points'
}
export const SOURCE_LAYERS = [
  {
    layerId: SOURCE_LAYER.COUNTRY,
    sourceBaseUrl: 'api/maas/tiles/cm-boundaries-adm0/{z}/{x}/{y}'
  },
  {
    layerId: SOURCE_LAYER.ADMIN1,
    sourceBaseUrl: 'api/maas/tiles/cm-boundaries-adm1/{z}/{x}/{y}'
  },
  {
    layerId: SOURCE_LAYER.ADMIN2,
    sourceBaseUrl: 'api/maas/tiles/cm-boundaries-adm2/{z}/{x}/{y}'
  },
  {
    layerId: SOURCE_LAYER.ADMIN3,
    sourceBaseUrl: 'api/maas/tiles/cm-boundaries-adm3/{z}/{x}/{y}'
  },
  {
    layerId: SOURCE_LAYER.GRID,
    sourceBaseUrl: 'api/maas/tiles/grid-output/{z}/{x}/{y}'
  },
  {
    layerId: SOURCE_LAYER.POINTS, // dummy layer for the points data which will be provided as geojson
    sourceBaseUrl: ''
  }
];

export function getSourceLayerById(layerId: SOURCE_LAYER) {
  return SOURCE_LAYERS.find(l => l.layerId === layerId) || SOURCE_LAYERS[0];
}

export function getMapSourceLayer (dataLayer: DATA_LAYER, adminLevel = 0) {
  const sLayers = [SOURCE_LAYER.COUNTRY, SOURCE_LAYER.ADMIN1, SOURCE_LAYER.ADMIN2, SOURCE_LAYER.ADMIN3];
  switch (dataLayer) {
    case DATA_LAYER.ADMIN:
      return getSourceLayerById(sLayers[adminLevel]);
    case DATA_LAYER.TILES:
      return getSourceLayerById(SOURCE_LAYER.GRID);
    case DATA_LAYER.RAW:
      return getSourceLayerById(SOURCE_LAYER.POINTS);
    default:
      return getSourceLayerById(sLayers[adminLevel]);
  }
}

// Resolve edge case where min and max are equal. Often happens when there's single data point when calculating min/max
// Eg. Region data only has Ethiopia at country level.
function resolveSameMinMaxValue({ min, max }: { min: number; max: number}) {
  if (min === 0 && max === 0) {
    return { min: -1, max: 1 };
  }
  const result = { min, max };
  if (min === max) {
    result[Math.sign(result.min) === -1 ? 'max' : 'min'] = 0;
  }
  return result;
}

function isNoneRegionId(regionId: string) {
  const tokens = regionId.split(REGION_ID_DELIMETER);
  return tokens.reduce((prev, cur) => prev && (cur === 'None'), true);
}

export function applyRegionFilter(regionalData: RegionalAggregations, selection: AdminRegionSets) {
  const result: RegionalAggregations = {
    country: [],
    admin1: [],
    admin2: [],
    admin3: []
  };
  for (const [key, data] of Object.entries(regionalData)) {
    const isAllSelected = isSelectionEmpty(selection, stringToAdminLevel(key), true);
    result[key as keyof RegionalAggregations] = (data || []).filter(agg => {
      const isSelected = isAllSelected || isRegionSelected(selection, agg.id, true);
      return isSelected && !isNoneRegionId(agg.id);
    });
  }
  return result;
}

// Compute min/max stats for regional data
export function computeRegionalStats(regionData: RegionalAggregations, baselineProp: string | null, showPercentChange: boolean): AnalysisMapStats {
  const globalStats: MapLayerStats = {};
  // Stats globally across all runs
  for (const [key, data] of Object.entries(regionData)) {
    const values = [];
    for (const v of (data || [])) {
      values.push(...Object.values(_.omit(v.values, '_baseline')));
    }
    if (values.length) {
      globalStats[key] = resolveSameMinMaxValue({ min: Math.min(...values), max: Math.max(...values) });
    }
  }
  const baseline: MapLayerStats = {};
  const difference: MapLayerStats = {};
  if (baselineProp) {
    // Stats for the baseline run for each admin level
    for (const [key, data] of Object.entries(regionData)) {
      const values = (data || []).filter(v => v.values[baselineProp] !== undefined).map(v => v.values[baselineProp]);
      if (values.length) {
        baseline[key] = resolveSameMinMaxValue({ min: Math.min(...values), max: Math.max(...values) });
      }
    }

    // Stats relative to the baseline. (min/max of the difference relative to the baseline)
    for (const [key, data] of Object.entries(regionData)) {
      const values: number[] = [];
      (data || []).forEach(v => {
        const baselineValue = _.isFinite(v.values[baselineProp]) ? v.values[baselineProp] : v.values._baseline;
        const diffs = Object.values(v.values).map(value => calculateDiff(baselineValue, value, showPercentChange));
        values.push(...diffs.filter(v => _.isFinite(v)));
      });
      if (values.length) {
        difference[key] = resolveSameMinMaxValue({ min: Math.min(...values), max: Math.max(...values) });
      }
    }
  }
  return {
    global: globalStats,
    baseline,
    difference
  };
}

export function computeGridLayerStats(gridOutputStats: OutputStatsResult[], baselineProp: string | null): AnalysisMapStats {
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
        globalStats[zoom] = resolveSameMinMaxValue({ min: Math.min(globalStats[zoom].min, stat.min), max: Math.max(globalStats[zoom].max, stat.max) });
      } else {
        globalStats[zoom] = resolveSameMinMaxValue({ min: stat.min, max: stat.max });
      }
    }
  }
  if (baselineProp) {
    // Stats for the baseline map
    const stats = gridOutputStats.find(item => item.outputSpecId === baselineProp)?.stats;
    (stats || []).forEach(stat => {
      baseline[stat.zoom - Z_DIFF] = resolveSameMinMaxValue({ min: stat.min, max: stat.max });
    });
  }
  return {
    global: globalStats,
    baseline,
    difference: {}
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
    globalStats.all = resolveSameMinMaxValue({ min: Math.min(...values), max: Math.max(...values) });
  }
  return {
    global: globalStats,
    // baseline and difference is not applicable with raw data
    baseline: {},
    difference: {}
  };
}

export async function computeMapBoundsForCountries(regionIds: string[]) {
  if (!regionIds?.length) return null;
  return await getBboxFromRegionIds(regionIds);
}
