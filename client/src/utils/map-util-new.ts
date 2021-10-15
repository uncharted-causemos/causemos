import _ from 'lodash';
import { OutputStatsResult, RegionalAggregations } from '@/types/Runoutput';
import { AnalysisMapStats, MapLayerStats } from '@/types/Common';
import { calculateDiff } from '@/utils/value-util';

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

// Compute min/max stats for regional data
export function computeRegionalStats(regionData: RegionalAggregations, baselineProp: string | null, usePercentChange: boolean): AnalysisMapStats {
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
      (data || []).forEach(v => {
        const baselineValue = _.isFinite(v.values[baselineProp]) ? v.values[baselineProp] : v.values._baseline;
        const diffs = Object.values(v.values).map(value => calculateDiff(baselineValue, value, usePercentChange));
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
