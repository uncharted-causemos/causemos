import _ from 'lodash';
import { OutputStatsResult, RegionalAggregations } from '@/types/Runoutput';
// import { AdminLevel } from '@/types/Enums';

interface MapLayerStats {
  [key: string]: { min: number; max: number };
}

export enum BASE_LAYER {
  SATELLITE = 'satellite',
  DEFAULT = 'default'
}

export enum DATA_LAYER {
  ADMIN = 'admin',
  TILES = 'tiles'
}

export function adminLevelToString(level: number) {
  const adminLevel = level === 0 ? 'country' : 'admin' + level;
  return adminLevel;
}

// Resolve edge case where min and max are equal. Often happens when there's single data point when calculating min/max
// Eg. Region data only has Ethiopia at country level.
function resolveSameMinMaxValue(minMax: { min: number; max: number}) {
  const { min, max } = minMax;
  if (min === 0 && max === 0) {
    return { min: -1, max: 1 };
  }
  const result = { ...minMax };
  if (min === max) {
    result[Math.sign(result.min) === -1 ? 'max' : 'min'] = 0;
  }
  return result;
}

// Compute min/max stats for regional data
export function computeRegionalStats(regionData: RegionalAggregations, baselineProp?: string) {
  const global: MapLayerStats = {};
  // Stats globally across all runs
  for (const [key, data] of Object.entries(regionData)) {
    const values = [];
    for (const v of (data || [])) {
      values.push(...Object.values(_.omit(v.values, 'unselected region')));
    }
    if (values.length) {
      global[key] = resolveSameMinMaxValue({ min: Math.min(...values), max: Math.max(...values) });
    }
  }
  const baseline: MapLayerStats = {};
  const difference: MapLayerStats = {};
  if (baselineProp) {
    // Stats for the baseline run
    for (const [key, data] of Object.entries(regionData)) {
      const values = (data || []).filter(v => v.values[baselineProp] !== undefined).map(v => v.values[baselineProp]);
      if (values.length) {
        baseline[key] = resolveSameMinMaxValue({ min: Math.min(...values), max: Math.max(...values) });
      }
    }

    // Stats relative to the baseline. (min/max of the difference relative to the baseline)
    for (const [key, data] of Object.entries(regionData)) {
      const values: number[] = [];
      (data || []).filter(v => v.values[baselineProp] !== undefined).forEach(v => {
        const diffs = Object.values(v.values).map(value => value - v.values[baselineProp]);
        values.push(...diffs);
      });
      if (values.length) {
        difference[key] = resolveSameMinMaxValue({ min: Math.min(...values), max: Math.max(...values) });
      }
    }
  }
  return {
    global,
    baseline,
    difference
  };
}

export function computeGridLayerStats(gridOutputStats: OutputStatsResult[], baselineProp?: string) {
  // NOTE: stat data is stored in the backend with subtile (grid cell) precision (zoom) level instead of the tile zoom level.
  // The difference is 6 so we subtract the difference to make the lowest level 0.
  const Z_DIFF = 6;
  const global: MapLayerStats = {};
  const baseline: MapLayerStats = {};
  // Stats globally across all maps
  for (const item of gridOutputStats) {
    for (const stat of item.stats) {
      const zoom = stat.zoom - Z_DIFF;
      if (global[zoom]) {
        global[zoom] = { min: Math.min(global[zoom].min, stat.min), max: Math.max(global[zoom].max, stat.max) };
      } else {
        global[zoom] = { min: stat.min, max: stat.max };
      }
    }
  }
  if (baselineProp) {
    // Stats for the baseline map
    const stats = gridOutputStats.find(item => item.outputSpecId === baselineProp)?.stats;
    (stats || []).forEach(stat => {
      baseline[stat.zoom - Z_DIFF] = { min: stat.min, max: stat.max };
    });
  }
  return {
    global,
    baseline
  };
}
