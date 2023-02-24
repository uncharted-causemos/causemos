<template>
  <div class="index-results-map-container">
    <RegionMap
      :data="regionMapData"
      :region-filter="undefined"
      :selected-admin-level="0"
      :disable-pan-zoom="false"
    />
    <mapLegend :ramp="mapLegendData" :isContinuous="false" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import RegionMap from '@/components/widgets/region-map.vue';
import mapLegend from '../widgets/map-legend.vue';
import { buildRegionMapData } from '@/utils/indextree-util';
import { IndexResultsData } from '@/types/Index';
import { createMapLegendDataWithDiscreteOutputScale } from '@/utils/map-util-new';
import { COLOR, getColors } from '@/utils/colors-util';
import { SCALE } from '@/types/Enums';

interface Props {
  indexResultsData: IndexResultsData[];
}
const props = defineProps<Props>();

// Default color config
const scale = SCALE.Quantile;
const numColors = 7;
const colors = getColors(COLOR.PRIORITIZATION, numColors);

// const domain = computed(() => {
//   return scale === SCALE.Quantile ? props.indexResultsData.map(item => item.value as number) : [0, 100]
// })

const getDomain = (scale: SCALE) => {
  return scale === SCALE.Quantile
    ? props.indexResultsData.map((item) => item.value as number)
    : [0, 100];
};

const regionMapData = computed(() =>
  buildRegionMapData(props.indexResultsData, getDomain(scale), colors, scale)
);
const mapLegendData = createMapLegendDataWithDiscreteOutputScale(getDomain(scale), colors, scale);
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
