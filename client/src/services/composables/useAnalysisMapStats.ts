import _ from 'lodash';
import { Ref, ref, computed } from '@vue/reactivity';
import { watchEffect } from '@vue/runtime-core';
import { MapLegendColor, AnalysisMapStats, AnalysisMapColorOptions } from '@/types/Common';
import { OutputSpecWithId, OutputStatsResult, RegionalAggregations, RawOutputDataPoint } from '@/types/Runoutput';
import { computeRegionalStats, computeRawDataStats, adminLevelToString, computeGridLayerStats, DATA_LAYER } from '@/utils/map-util-new';
import { createMapLegendData } from '@/utils/map-util';
import { calculateDiff } from '@/utils/value-util';
import { getOutputStats } from '@/services/runoutput-service';
import { SpatialAggregationLevel, TemporalAggregationLevel } from '@/types/Enums';

export default function useAnalysisMapStats(
  outputSourceSpecs: Ref<OutputSpecWithId[]>,
  regionalData: Ref<RegionalAggregations | null>,
  relativeTo: Ref<string | null>,
  selectedDataLayer: Ref<DATA_LAYER>,
  selectedAdminLevel: Ref<number>,
  showPercentChange: Ref<boolean>,
  colorOptions: Ref<AnalysisMapColorOptions>,
  referenceOptions: Ref<string[]>,
  breakdownOption: Ref<string | null>,
  rawDataPoints: Ref<RawOutputDataPoint[]>
) {
  // ===== Set up stats and legend for the admin layer ===== //

  const adminMapLayerLegendData = ref<MapLegendColor[][]>([]);
  const adminLayerStats = ref<AnalysisMapStats>();
  watchEffect(() => {
    if (!regionalData.value) {
      adminMapLayerLegendData.value = [];
      return;
    }
    adminLayerStats.value = computeRegionalStats(regionalData.value, relativeTo.value, showPercentChange.value);
    /*
      If we are using a relative time series and it's not a temporal reference series then retrieve the map stats.
      We exclude temporal reference series as aren't using the aggregated endpoints for that scenario yet, so we can't
      retrieve any relative map data for say 2017 as a concept yet.
    */
    if (relativeTo.value && breakdownOption.value !== TemporalAggregationLevel.Year) {
      const currentAdminLevel =
        breakdownOption.value === SpatialAggregationLevel.Region &&
        referenceOptions.value.includes(relativeTo.value)
          ? 0
          : selectedAdminLevel.value;

      const baseline = adminLayerStats.value.baseline[adminLevelToString(currentAdminLevel)];
      const difference = adminLayerStats.value.difference[adminLevelToString(currentAdminLevel)];
      adminMapLayerLegendData.value = (baseline && difference) ? [
        createMapLegendData([baseline.min, baseline.max], colorOptions.value.relativeToSchemes[0], colorOptions.value.scaleFn),
        createMapLegendData([difference.min, difference.max], colorOptions.value.relativeToSchemes[1], colorOptions.value.scaleFn, true)
      ] : [];
    } else {
      const globalStats = adminLayerStats.value.global[adminLevelToString(selectedAdminLevel.value)];
      adminMapLayerLegendData.value = globalStats ? [
        createMapLegendData([globalStats.min, globalStats.max], colorOptions.value.scheme, colorOptions.value.scaleFn, colorOptions.value.isDiverging)
      ] : [];
    }
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

  const pointsMapLayerLegendData = ref<MapLegendColor[][]>([]);
  const pointsLayerStats = ref<AnalysisMapStats>();
  watchEffect(() => {
    pointsLayerStats.value = computeRawDataStats(rawDataPoints.value);
    const globalStats = pointsLayerStats.value.global.all;
    pointsMapLayerLegendData.value = globalStats ? [
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
