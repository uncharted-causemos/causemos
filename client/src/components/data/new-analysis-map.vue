<template>
  <div class="new-analysis-map-container">
    <span v-if="outputSpecs.length > 1" :style="{ color: color }" class="map-label">
      <div class="color-indicator" :style="{ background: color }" />
      <span>{{ getOutputSpecName(outputSpecId) }}</span>
    </span>
    <analysis-map
      class="analysis-map"
      :style="{ borderColor: color }"
      :output-source-specs="outputSpecs"
      :output-selection="outputSpecId"
      :relative-to="
        breakdownState.comparisonSettings.shouldDisplayAbsoluteValues === false
          ? breakdownState.comparisonSettings.baselineTimeseriesId
          : undefined
      "
      :show-tooltip="true"
      :selected-layer-id="getSelectedLayer()"
      :map-bounds="mapBounds"
      :region-data="regionalData"
      :raw-data="[]"
      :selected-regions="mapSelectedRegions"
      :admin-layer-stats="adminLayerStats"
      :grid-layer-stats="gridLayerStats"
      :points-layer-stats="pointsLayerStats"
      :selected-base-layer="selectedBaseLayer"
      :unit="unit"
      :color-options="mapColorOptions"
      :show-percent-change="breakdownState.comparisonSettings.shouldUseRelativePercentage"
      @sync-bounds="(bounds: BoundingBox) => emit('map-move', bounds)"
      @zoom-change="updateMapCurSyncedZoom"
      @map-update="recalculateGridMapDiffStats"
    />
    <!-- TODO: raw data -->
    <!-- raw data="rawDataPointsList[indx]"" -->

    <analysis-map-legend
      v-if="mapLegendData.length > 0"
      class="legend"
      :ramp="getMapLegend()"
      :isContinuous="isContinuousScale"
    />
  </div>
</template>

<script setup lang="ts">
import AnalysisMap from '@/components/data/analysis-map.vue';
import AnalysisMapLegend from '@/components/widgets/analysis-map-legend.vue';
import useAnalysisMapStats from '@/composables/useAnalysisMapStats';
import useDatacubeColorScheme from '@/composables/useDatacubeColorScheme';
import useOutputSpecDisplayNames from '@/composables/useOutputSpecDisplayNames';
import { BoundingBox, MapBounds } from '@/types/Common';
import { BreakdownState, Indicator, Model } from '@/types/Datacube';
import { AdminRegionSets } from '@/types/Datacubes';
import { SpatialAggregation, SpatialAggregationLevel } from '@/types/Enums';
import { OutputSpecWithId, RegionalAggregations } from '@/types/Outputdata';
import { stringToAdminLevel } from '@/utils/admin-level-util';
import { getRegionIdsFromBreakdownState, isBreakdownStateRegions } from '@/utils/datacube-util';
import { BASE_LAYER, DATA_LAYER, SOURCE_LAYERS, getMapSourceLayer } from '@/utils/map-util-new';
import { computed, ref, toRefs } from 'vue';

const emit = defineEmits<{ (e: 'map-move', bounds: BoundingBox): void }>();

const props = defineProps<{
  color: string;
  outputSpecs: OutputSpecWithId[];
  outputSpecId: string;
  breakdownState: BreakdownState;
  spatialAggregation: SpatialAggregation;
  regionalData: RegionalAggregations;
  metadata: Model | Indicator | null;
  unit: string;
  mapBounds?: MapBounds;
}>();
const { breakdownState, outputSpecs, spatialAggregation, regionalData, metadata } = toRefs(props);

// TODO: user-selected
// Default or satellite
const selectedBaseLayer = ref(BASE_LAYER.DEFAULT);
// Admin, tiles, or dot
const selectedDataLayer = ref(DATA_LAYER.ADMIN);

const getSelectedLayer = (): string => {
  const adminLevel =
    spatialAggregation.value === 'tiles' ? 0 : stringToAdminLevel(spatialAggregation.value);
  const selectedLayerId = getMapSourceLayer(selectedDataLayer.value, adminLevel).layerId;

  // TODO: If the current output spec is a "split by region" reference series, return SOURCE_LAYER.COUNTRY
  //  we can probably determine this using the timeseries ID alone
  const isReferenceSeries = false;
  // const isReferenceSeries = this.availableReferenceOptions.filter((item) => item.id === id).length > 0;
  const layerId =
    isReferenceSeries &&
    breakdownState.value !== null &&
    isBreakdownStateRegions(breakdownState.value) &&
    selectedDataLayer.value === DATA_LAYER.ADMIN
      ? SOURCE_LAYERS[0].layerId
      : selectedLayerId;
  return layerId;
};

const { mapColorOptions, isContinuousScale } = useDatacubeColorScheme();
// HACK: useAnalysisMapStats needs to know if "split by region" is active. Once the old data space
//  is removed, we can replace the breakdownOption parameter with a simple boolean.
const breakdownOption = computed(() =>
  breakdownState.value && isBreakdownStateRegions(breakdownState.value)
    ? SpatialAggregationLevel.Region
    : null
);
// This is a legacy data structure that's required for useAnalysisMapStats and analysis-map.vue.
//  We just wrap the selected regionIds from the breakdown state in a Set and put that in an object.
const mapSelectedRegions = computed<AdminRegionSets>(() => {
  const result: AdminRegionSets = {
    country: new Set(),
    admin1: new Set(),
    admin2: new Set(),
    admin3: new Set(),
  };
  if (spatialAggregation.value === 'tiles') {
    return result;
  }
  const newSet = new Set(getRegionIdsFromBreakdownState(breakdownState.value));
  result[spatialAggregation.value] = newSet;
  return result;
});
// useAnalysisMapStats expects this to be null if "relative to" mode isn't active, and otherwise
//  it should be the id of the baseline maps that the other specs are compared to.
const relativeTo = computed(() => {
  if (breakdownState.value === null) return null;
  return breakdownState.value.comparisonSettings.shouldDisplayAbsoluteValues
    ? null
    : breakdownState.value.comparisonSettings.baselineTimeseriesId;
});
const {
  updateMapCurSyncedZoom,
  recalculateGridMapDiffStats,
  adminLayerStats,
  gridLayerStats,
  pointsLayerStats,
  mapLegendData,
} = useAnalysisMapStats(
  outputSpecs,
  regionalData,
  relativeTo,
  selectedDataLayer,
  computed(() => stringToAdminLevel(spatialAggregation.value)),
  mapSelectedRegions,
  computed(() => breakdownState.value?.comparisonSettings.shouldDisplayAbsoluteValues ?? false),
  mapColorOptions,
  ref([]), // TODO: activeReferenceOptions,
  breakdownOption,
  ref([]) // TODO: rawDataPointsList
);
const getMapLegend = () => {
  if (
    mapLegendData.value.length === 2 &&
    breakdownState.value.comparisonSettings.shouldDisplayAbsoluteValues === false &&
    props.outputSpecId === breakdownState.value.comparisonSettings.baselineTimeseriesId
  ) {
    return mapLegendData.value[1];
  }
  return mapLegendData.value[0];
};

const { getOutputSpecName } = useOutputSpecDisplayNames(breakdownState, metadata);
</script>

<style lang="scss" scoped>
.new-analysis-map-container {
  position: relative;
  isolation: isolate;
}

.analysis-map {
  height: 100%;
  width: 100%;
}

$mapPadding: 5px;

.map-label {
  --horizontal-padding: 5px;
  position: absolute;
  background: white;
  padding: 2px var(--horizontal-padding);
  top: $mapPadding;
  left: $mapPadding;
  z-index: 1; // Render overtop of the map
  display: flex;
  align-items: center;
  gap: 5px;
  max-width: calc(100% - calc(2 * var(--horizontal-padding)));

  .color-indicator {
    width: 7px;
    height: 7px;
  }

  span {
    flex: 1;
    min-width: 0;
  }
}

.legend {
  position: absolute;
  bottom: $mapPadding;
  left: $mapPadding;
  height: 150px;
}
</style>
