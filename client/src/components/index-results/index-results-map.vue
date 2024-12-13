<template>
  <div class="index-results-map-container">
    <RegionMap
      :data="regionMapData"
      :map-bounds="mapBounds"
      :selected-admin-level="stringToAdminLevel(aggregationLevel)"
      :disable-pan-zoom="false"
      :hovered-region-id="hoveredRegionId"
      @click-region="(regionId) => emit('click-region', regionId)"
      @region-hover="
        (regionId) =>
          regionId === null ? emit('stop-hover-region') : emit('hover-region', regionId)
      "
    />
    <AnalysisMapLegend :ramp="mapLegendData" :isContinuous="false" :formatter="d3.format(',.0f')" />
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { computed, ref, watch } from 'vue';
import RegionMap from '@/components/widgets/region-map.vue';
import AnalysisMapLegend from '../widgets/analysis-map-legend.vue';
import { getIndexResultsColorConfig } from '@/utils/index-results-util';
import { IndexResultsData, IndexResultsSettings } from '@/types/Index';
import {
  BOUNDS_GLOBAL,
  createMapLegendDataWithDiscreteOutputScale,
  computeMapBoundsForCountries,
} from '@/utils/map-util-new';
import { RegionMapData } from '@/types/Common';
import { AdminLevel } from '@/types/Enums';
import { stringToAdminLevel } from '@/utils/admin-level-util';

interface Props {
  indexResultsData: IndexResultsData[];
  settings: IndexResultsSettings;
  aggregationLevel: AdminLevel;
  hoveredRegionId: string | null;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'click-region', regionId: string): void;
  (e: 'hover-region', regionId: string): void;
  (e: 'stop-hover-region'): void;
}>();

const mapBounds = ref<[[number, number], [number, number]]>(BOUNDS_GLOBAL);
watch(
  () => props.indexResultsData,
  async () => {
    mapBounds.value =
      (await computeMapBoundsForCountries(props.indexResultsData.map((v) => v.regionId))) ||
      BOUNDS_GLOBAL;
  }
);

const colorConfig = computed(() =>
  getIndexResultsColorConfig(props.indexResultsData, props.settings)
);

const regionMapData = computed(() => {
  const mapData: RegionMapData[] = props.indexResultsData.map((d, index) => ({
    label: d.regionId,
    name: '' + (index + 1),
    color: colorConfig.value.scaleFn(d.value as number),
    value: d.value as number,
  }));
  return mapData;
});

const mapLegendData = computed(() =>
  createMapLegendDataWithDiscreteOutputScale(
    colorConfig.value.domain,
    colorConfig.value.colors,
    colorConfig.value.scale
  )
);
</script>

<style lang="scss" scoped>
.index-results-map-container {
  height: 100%;
  position: relative;
  .map-legend-container {
    position: absolute;
    height: 200px;
    bottom: 10px;
    right: 10px;
  }
}
</style>
