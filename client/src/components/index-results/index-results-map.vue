<template>
  <div class="index-results-map-container">
    <RegionMap
      :data="regionMapData"
      :map-bounds="mapBounds"
      :selected-admin-level="0"
      :disable-pan-zoom="false"
    />
    <MapLegend :ramp="mapLegendData" :isContinuous="false" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import RegionMap from '@/components/widgets/region-map.vue';
import MapLegend from '../widgets/map-legend.vue';
import { getIndexResultsColorConfig } from '@/utils/indexresults-util';
import { IndexResultsData, IndexResultsSettings } from '@/types/Index';
import {
  BOUNDS_GLOBAL,
  createMapLegendDataWithDiscreteOutputScale,
  computeMapBoundsForCountries,
} from '@/utils/map-util-new';
import { RegionMapData } from '@/types/Common';

interface Props {
  indexResultsData: IndexResultsData[];
  settings: IndexResultsSettings;
}
const props = defineProps<Props>();

const mapBounds = ref<[[number, number], [number, number]]>(BOUNDS_GLOBAL);
watch(
  () => props.indexResultsData,
  async () => {
    mapBounds.value =
      (await computeMapBoundsForCountries(props.indexResultsData.map((v) => v.countryName))) ||
      BOUNDS_GLOBAL;
  }
);

const colorConfig = computed(() =>
  getIndexResultsColorConfig(props.indexResultsData, props.settings)
);

const regionMapData = computed(() => {
  const mapData: RegionMapData[] = props.indexResultsData.map((d, index) => ({
    label: d.countryName,
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
  :deep(.color-label) {
    background: transparent;
    right: 25px;
  }
  .map-legend-container {
    position: relative;
    width: 48px;
    height: 400px;
    bottom: 450px;
    left: 10px;
  }
}
</style>
