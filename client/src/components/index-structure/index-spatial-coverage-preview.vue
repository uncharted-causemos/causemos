<template>
  <div>
    <p>{{ displayString }}</p>
    <div class="map">
      <RegionMap
        :data="regionMapData"
        :map-bounds="mapBounds"
        :min-zoom="MAP_MIN_ZOOM"
        :selected-admin-level="ADMIN_LEVEL"
        :disable-pan-zoom="true"
        :disable-popup="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { computed, ref, watch } from 'vue';
import RegionMap from '@/components/widgets/region-map.vue';
import { BOUNDS_GLOBAL, computeMapBoundsForCountries } from '@/utils/map-util-new';
import { getColors, COLOR } from '@/utils/colors-util';

import { MapBounds, RegionMapData } from '@/types/Common';
import { ConceptNodeWithDatasetAttached } from '@/types/Index';
import { convertDataConfigToOutputSpec } from '@/utils/index-tree-util';
import { getIndexRegionAggregation, TRANSFORM_NORM } from '@/services/outputdata-service';
import { adminLevelToString } from '@/utils/admin-level-util';

const MAP_MIN_ZOOM = -0.5;
const MAP_BOUNDS_ANIMATION_DURATION = 1000;
const MAP_COLOR = COLOR.DEFAULT;
const NUM_COLORS = 5;
const DOMAIN = [0, 1];
const ADMIN_LEVEL = 0;

const props = defineProps<{
  node: ConceptNodeWithDatasetAttached;
  countries: string[] | null;
}>();

const colors = getColors(MAP_COLOR, NUM_COLORS);
const scaleFn = d3.scaleQuantize(DOMAIN, colors);

const mapBounds = ref<MapBounds>({ value: BOUNDS_GLOBAL });
watch(
  () => props.countries,
  async () => {
    const bounds = props.countries
      ? (await computeMapBoundsForCountries(props.countries)) || BOUNDS_GLOBAL
      : BOUNDS_GLOBAL;
    mapBounds.value = {
      value: bounds,
      options: { duration: MAP_BOUNDS_ANIMATION_DURATION },
    };
  },
  { immediate: true }
);

const regionMapData = ref<RegionMapData[]>([]);
const loadMapData = async () => {
  if (!props.node) {
    regionMapData.value = [];
    return;
  }
  const result = await getIndexRegionAggregation({
    ...convertDataConfigToOutputSpec(props.node.dataset.config),
    transform: TRANSFORM_NORM,
    adminLevel: adminLevelToString(ADMIN_LEVEL),
  });
  const mapData: RegionMapData[] = (result.country || []).map((country) => ({
    label: country.id,
    name: '',
    color: scaleFn(country.value as number),
    value: country.value as number,
  }));
  regionMapData.value = mapData;
};
watch(() => props.node, loadMapData, { immediate: true });

const displayString = computed(() => {
  if (props.countries === null) {
    return '...';
  }
  const count = props.countries.length;
  return `${count} countr${count === 1 ? 'y' : 'ies'}.`;
});
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';

.map {
  height: 150px;
  position: relative;
  pointer-events: none;
}
</style>
