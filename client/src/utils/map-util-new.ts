import _ from 'lodash';
import { OutputStatsResult, RegionalAggregations } from '@/types/Runoutput';
import { AnalysisMapStats, MapLayerStats } from '@/types/Common';
import { calculateDiff } from '@/utils/value-util';
import { DatacubeGeoAttributeVariableType } from '@/types/Enums';
import { getGADMSuggestions } from '@/services/suggestion-service';

// only allow fetching a maximum number of bbox for of a list of countries
const MAX_NUMBER_BBOX_COUNTRIES = 10;

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
  TILES = 'tiles'
}

export function adminLevelToString(level: number) {
  const adminLevel = level === 0 ? 'country' : 'admin' + level;
  return adminLevel;
}

export function stringToAdminLevel(geoString: string) {
  const adminLevel = geoString === DatacubeGeoAttributeVariableType.Country ? 0 : +(geoString[geoString.length - 1]);
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

export async function computeMapBoundsForCountries(countryList: string[]) {
  //
  // calculate the map bounds covering the geography covered by the input list of countries
  //
  if (countryList.length > 0) {
    let countries = countryList;
    if (countries.length > MAX_NUMBER_BBOX_COUNTRIES) {
      countries = countries.slice(0, MAX_NUMBER_BBOX_COUNTRIES);
    }

    const allBBox: any = [];
    // fetch the bbox for country of the input geography
    const promises = countries.map(country => {
      const debouncedFetchFunction = getGADMSuggestions(DatacubeGeoAttributeVariableType.Country, country);
      return debouncedFetchFunction(); // NOTE: a debounced function may return undefined
    });
    const allResults = await Promise.all(promises);
    allResults.forEach(result => {
      if (result !== undefined) {
        allBBox.push(...result.map(item => item.bbox ? item.bbox.coordinates : []));
      }
    });
    // allBBox is an array of bbox values for each country of the input geography
    //  calculate the union bbox by merging all bbox into a global one
    if (allBBox.length > 0) {
      const finalBBox: number[][] = allBBox[0];
      allBBox.forEach((bbox: number[][]) => {
        // [[minLon, maxLat], [maxLon, minLat]]:
        if (bbox[0][0] < finalBBox[0][0]) {
          finalBBox[0][0] = bbox[0][0];
        }
        if (bbox[0][1] > finalBBox[0][1]) {
          finalBBox[0][1] = bbox[0][1];
        }
        if (bbox[1][0] > finalBBox[1][0]) {
          finalBBox[1][0] = bbox[1][0];
        }
        if (bbox[1][1] < finalBBox[1][1]) {
          finalBBox[1][1] = bbox[1][1];
        }
      });
      // return the final, global, bbox
      return finalBBox;
    }
  }
  return null;
}
