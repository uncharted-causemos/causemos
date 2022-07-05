import _ from 'lodash';
import { Ref, ref, computed } from '@vue/reactivity';
import { watchEffect } from '@vue/runtime-core';
import { MapLegendColor, AnalysisMapStats, MapLayerStats, AnalysisMapRange, AnalysisMapColorOptions } from '@/types/Common';
import { OutputSpecWithId, OutputStatsResult, RegionalAggregations, RawOutputDataPoint } from '@/types/Outputdata';
import { getActiveRegions, computeRegionalStats, resolveSameMinMaxMapStats, computeRawDataStats, computeGridLayerStats, DATA_LAYER } from '@/utils/map-util-new';
import { adminLevelToString } from '@/utils/admin-level-util';
import { createMapLegendData } from '@/utils/map-util';
import { calculateDiff } from '@/utils/value-util';
import { getOutputStats } from '@/services/outputdata-service';
import { SpatialAggregationLevel } from '@/types/Enums';
import { AdminRegionSets } from '@/types/Datacubes';

const computeMinMax = (stats: (AnalysisMapRange|undefined)[]) => {
  const list = stats.filter(v => v); // filter out undefined
  if (list.length === 0) return;
  return (list as AnalysisMapRange[]).reduce((prev, cur) => {
    return {
      min: Math.min(prev.min, cur.min),
      max: Math.max(prev.max, cur.max)
    };
  }, { min: Infinity, max: -Infinity });
};

// Get stats for the provided admin level
const getStats = (layerStats: MapLayerStats | undefined, level: number) => {
  if (!layerStats) return;
  // In Split by region mode, if there's no stats for the current level, use stats from the parent level
  const statsList = [layerStats.country, layerStats.admin1, layerStats.admin2, layerStats.admin3].slice(0, level + 1);
  let stats;
  while (statsList.length > 0 && stats === undefined) {
    stats = statsList.pop();
  }
  return stats;
};

export default function useAnalysisMapStats(
  outputSourceSpecs: Ref<OutputSpecWithId[]>,
  regionalData: Ref<RegionalAggregations | null>,
  relativeTo: Ref<string | null>,
  selectedDataLayer: Ref<DATA_LAYER>,
  selectedAdminLevel: Ref<number>,
  regionSelection: Ref<AdminRegionSets>,
  showPercentChange: Ref<boolean>,
  colorOptions: Ref<AnalysisMapColorOptions>,
  referenceOptions: Ref<string[]>,
  breakdownOption: Ref<string | null>,
  rawDataPointsList: Ref<RawOutputDataPoint[][]>
) {
  // ===== Set up stats and legend for the admin layer ===== //

  const adminMapLayerLegendData = ref<MapLegendColor[][]>([]);
  const adminLayerStats = ref<AnalysisMapStats>({
    global: {},
    baseline: {},
    difference: {}
  });
  watchEffect(() => {
    if (!regionalData.value) {
      adminMapLayerLegendData.value = [];
      return;
    }
    const adminStats = computeRegionalStats(
      getActiveRegions(regionalData.value, regionSelection.value),
      relativeTo.value,
      showPercentChange.value
    );

    // If there is a reference region selected, min and max stat should come from across different regional levels (country and currently selected admin level)
    if (referenceOptions.value.length > 0 && breakdownOption.value === SpatialAggregationLevel.Region) {
      // Assume that reference region is always at country level.
      const targetLevels = [0, selectedAdminLevel.value];
      const globalStat = computeMinMax(targetLevels.map(l => getStats(adminStats.global, l)));
      const baselineStat = computeMinMax(targetLevels.map(l => getStats(adminStats.baseline, l)));
      const differenceStat = computeMinMax(targetLevels.map(l => getStats(adminStats.difference, l)));

      // Assign same stats to all target admin levels
      targetLevels.map(adminLevelToString).forEach(l => {
        if (globalStat) adminStats.global[l] = globalStat;
        if (baselineStat) adminStats.baseline[l] = baselineStat;
        if (differenceStat) adminStats.difference[l] = differenceStat;
      });
    }
    const adminStatsResolved = resolveSameMinMaxMapStats(adminStats);

    /*
      If relativeTo is defined, generated the relative legend info, otherwise generate the default legend info.
    */
    if (relativeTo.value) {
      const baseline = getStats(adminStatsResolved.baseline, selectedAdminLevel.value);
      const difference = getStats(adminStatsResolved.difference, selectedAdminLevel.value);
      adminMapLayerLegendData.value = (baseline && difference) ? [
        createMapLegendData([baseline.min, baseline.max], colorOptions.value.relativeToSchemes[0], colorOptions.value.scaleFn),
        createMapLegendData([difference.min, difference.max], colorOptions.value.relativeToSchemes[1], colorOptions.value.scaleFn, true)
      ] : [];
    } else {
      const globalStats = getStats(adminStatsResolved.global, selectedAdminLevel.value);
      adminMapLayerLegendData.value = globalStats ? [
        createMapLegendData([globalStats.min, globalStats.max], colorOptions.value.scheme, colorOptions.value.scaleFn, colorOptions.value.isDiverging)
      ] : [];
    }
    adminLayerStats.value = adminStatsResolved;
  });

  // ===== Calculate stats and legend for the grid layer dynamically ===== //

  const gridMapLayerLegendData = ref<MapLegendColor[][]>([]);
  const outputStats = ref<OutputStatsResult[]>([]);
  const gridLayerStats = ref<AnalysisMapStats>();
  const mapCurZoom = ref<number>(0);
  const updateMapCurSyncedZoom = (data: { component: any }) => {
    if (mapCurZoom.value === data.component.curZoom) return;
    mapCurZoom.value = data.component.curZoom;
  };

  watchEffect(async onInvalidate => {
    // Update outputStats when ouputSourceSpecs changes
    if (outputSourceSpecs.value.length === 0) return;
    let isCancelled = false;
    onInvalidate(() => {
      isCancelled = true;
    });
    const result = await getOutputStats(outputSourceSpecs.value);
    if (isCancelled) return;
    outputStats.value = result;
  });
  watchEffect(() => {
    // update gridLayerStats when either outputStats or relativeTo changes
    gridLayerStats.value = {
      ...computeGridLayerStats(outputStats.value, relativeTo.value),
      difference: (gridLayerStats.value?.difference || {})
    };
  });

  const recalculateGridMapDiffStats = _.debounce(function({ component }: { component: any }) {
    if (!relativeTo.value || !component.isGridMap) return;
    const baselineProp = relativeTo.value;
    const features = component.map.queryRenderedFeatures({ layers: [component.baseLayerId] });
    const values = [];
    for (const feature of features) {
      for (const item of component.outputSourceSpecs) {
        const diff = calculateDiff(feature.properties[baselineProp], feature.properties[item.id], showPercentChange.value);
        if (_.isFinite(diff)) values.push(diff);
      }
    }
    gridLayerStats.value = {
      global: (gridLayerStats.value?.global || {}),
      baseline: (gridLayerStats.value?.baseline || {}),
      difference: { diff: { min: Math.min(...values), max: Math.max(...values) } }
    };
  }, 50);

  watchEffect(() => {
    // Update map legend data for grid map
    if (_.isEmpty(gridLayerStats.value)) {
      gridMapLayerLegendData.value = [];
      return;
    }
    if (relativeTo.value && !referenceOptions.value.includes(relativeTo.value)) {
      const baseline = gridLayerStats.value?.baseline[String(mapCurZoom.value)];
      const difference = gridLayerStats.value?.difference?.diff;
      gridMapLayerLegendData.value = (baseline && difference) ? [
        createMapLegendData([baseline.min, baseline.max], colorOptions.value.relativeToSchemes[0], colorOptions.value.scaleFn),
        createMapLegendData([difference.min, difference.max], colorOptions.value.relativeToSchemes[1], colorOptions.value.scaleFn, true)
      ] : [];
    } else {
      const globalStats = gridLayerStats.value?.global[String(mapCurZoom.value)];
      gridMapLayerLegendData.value = globalStats ? [
        createMapLegendData([globalStats.min, globalStats.max], colorOptions.value.scheme, colorOptions.value.scaleFn, colorOptions.value.isDiverging)
      ] : [];
    }
  });

  // ===== Set up stats and legend for raw points layer ===== //

  const pointsLayerStats = computed<AnalysisMapStats>(() => {
    return computeRawDataStats(rawDataPointsList.value);
  });
  const pointsMapLayerLegendData = computed<MapLegendColor[][]>(() => {
    const globalStats = pointsLayerStats.value.global.all;
    return globalStats ? [
      createMapLegendData([globalStats.min, globalStats.max], colorOptions.value.scheme, colorOptions.value.scaleFn, colorOptions.value.isDiverging)
    ] : [];
  });

  // ======================================================================== //

  const mapLegendData = computed(() => {
    switch (selectedDataLayer.value) {
      case DATA_LAYER.ADMIN:
        return adminMapLayerLegendData.value;
      case DATA_LAYER.TILES:
        return gridMapLayerLegendData.value;
      case DATA_LAYER.RAW:
        return pointsMapLayerLegendData.value;
      default:
        return adminMapLayerLegendData.value;
    }
  });

  return {
    updateMapCurSyncedZoom,
    recalculateGridMapDiffStats,
    adminLayerStats,
    gridLayerStats,
    pointsLayerStats,
    mapLegendData
  };
}
