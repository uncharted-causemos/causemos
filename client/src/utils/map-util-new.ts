import _ from 'lodash';
import { RegionalAggregations } from '@/types/Runoutput';
// import { AdminLevel } from '@/types/Enums';

interface RegionalStats {
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

// Compute min/max stats for regional data
export function computeRegionalStats(regionData: RegionalAggregations, baselineProp?: string) {
  const global: RegionalStats = {};
  // Stats globally across all runs
  for (const [key, data] of Object.entries(regionData)) {
    const values = [];
    for (const v of (data || [])) {
      values.push(...Object.values(_.omit(v.values, 'unselected region')));
    }
    if (values.length) {
      global[key] = { min: Math.min(...values), max: Math.max(...values) };
    }
  }
  const baseline: RegionalStats = {};
  const difference: RegionalStats = {};
  if (baselineProp) {
    // Stats for the baseline run
    for (const [key, data] of Object.entries(regionData)) {
      const values = (data || []).filter(v => v.values[baselineProp] !== undefined).map(v => v.values[baselineProp]);
      if (values.length) {
        baseline[key] = { min: Math.min(...values), max: Math.max(...values) };
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
        difference[key] = { min: Math.min(...values), max: Math.max(...values) };
      }
    }
  }
  return {
    global,
    baseline,
    difference
  };
}
