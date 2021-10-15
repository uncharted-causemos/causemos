import * as d3 from 'd3';
import _ from 'lodash';
import { Ref, ref, computed } from '@vue/reactivity';
import { watchEffect } from '@vue/runtime-core';
import { MapLegendColor, AnalysisMapStats } from '@/types/Common';
import { OutputSpecWithId, OutputStatsResult, RegionalAggregations } from '@/types/Runoutput';
import { computeRegionalStats, adminLevelToString, computeGridLayerStats, DATA_LAYER } from '@/utils/map-util-new';
import { createMapLegendData, ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';
import { COLOR_SCHEME } from '@/utils/colors-util';
import { calculateDiff } from '@/utils/value-util';
import { getOutputStats } from '@/services/runoutput-service';

export default function useAnalysisMapStats(
  outputSourceSpecs: Ref<OutputSpecWithId[]>,
  regionalData: Ref<RegionalAggregations | null>,
  relativeTo: Ref<string | null>,
  selectedDataLayer: Ref<string>,
  selectedAdminLevel: Ref<number>,
  usePercentageDiff: Ref<boolean>
) {
  const adminMapLayerLegendData = ref<MapLegendColor[][]>([]);
  const gridMapLayerLegendData = ref<MapLegendColor[][]>([]);
  const adminLayerStats = ref<AnalysisMapStats>();
  watchEffect(() => {
    if (!regionalData.value) {
      adminMapLayerLegendData.value = [];
      return;
    }
    adminLayerStats.value = computeRegionalStats(regionalData.value, relativeTo.value, usePercentageDiff.value);
    if (relativeTo.value) {
      const baseline = adminLayerStats.value.baseline[adminLevelToString(selectedAdminLevel.value)];
      const difference = adminLayerStats.value.difference[adminLevelToString(selectedAdminLevel.value)];
      adminMapLayerLegendData.value = (baseline && difference) ? [
        createMapLegendData([baseline.min, baseline.max], COLOR_SCHEME.GREYS_7, d3.scaleLinear),
        createMapLegendData([difference.min, difference.max], COLOR_SCHEME.PIYG_7, d3.scaleLinear, true)
      ] : [];
    } else {
      const globalStats = adminLayerStats.value.global[adminLevelToString(selectedAdminLevel.value)];
      adminMapLayerLegendData.value = globalStats ? [
        createMapLegendData([globalStats.min, globalStats.max], COLOR_SCHEME.PURPLES_7, d3.scaleLinear)
      ] : [];
    }
  });

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
        const diff = calculateDiff(feature.properties[baselineProp], feature.properties[item.id], usePercentageDiff.value);
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
    if (relativeTo.value) {
      const baseline = gridLayerStats.value?.baseline[String(mapCurZoom.value)];
      const difference = gridLayerStats.value?.difference?.diff;
      gridMapLayerLegendData.value = (baseline && difference) ? [
        createMapLegendData([baseline.min, baseline.max], COLOR_SCHEME.GREYS_7, d3.scaleLinear),
        createMapLegendData([difference.min, difference.max], COLOR_SCHEME.PIYG_7, d3.scaleLinear, true)
      ] : [];
    } else {
      const globalStats = gridLayerStats.value?.global[String(mapCurZoom.value)];
      gridMapLayerLegendData.value = globalStats ? [
        createMapLegendData([globalStats.min, globalStats.max], COLOR_SCHEME.PURPLES_7, d3.scaleLinear)
      ] : [];
    }
  });

  const isGridLayer = computed(() => {
    return selectedDataLayer.value === DATA_LAYER.TILES;
  });

  const mapSelectedLayer = computed(() => isGridLayer.value ? 4 : selectedAdminLevel.value);

  const mapLegendData = computed(() => {
    return isGridLayer.value ? gridMapLayerLegendData.value : adminMapLayerLegendData.value;
  });

  const mapBounds = ref<number[][]>([
    [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
    [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
  ]);

  const onSyncMapBounds = (bounds: number[][]) => {
    mapBounds.value = bounds;
  };

  return {
    onSyncMapBounds,
    updateMapCurSyncedZoom,
    recalculateGridMapDiffStats,
    adminLayerStats,
    gridLayerStats,
    gridMapLayerLegendData,
    adminMapLayerLegendData,
    mapLegendData,
    isGridLayer,
    mapSelectedLayer,
    mapBounds
  };
}
