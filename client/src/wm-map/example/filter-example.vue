<template>
  <!-- Large map with all layers -->
  <div style="height: 500px; width: 500px">
    <wm-map
      v-if="mapData"
      ref="wmmap"
      :center="center"
      :zoom="zoom"
      :bearing="bearing"
      :pitch="pitch"
      @load="onLoad"
    >
      <wm-map-geojson
        :source-id="'source-data'"
        :source="mapData.source"
        :layer-id="'base-layer'"
        :layer="mapData.layers.base"
      />
      <wm-map-geojson
        :source-id="'source-data'"
        :layer-id="'color-layer'"
        :layer="mapData.layers.data"
      />
    </wm-map>
    <div v-if="data" class="value-slider">
      <input v-model="filter.value.gte" type="range" :min="data.min" :max="data.max" />
      <input v-model="filter.value.lte" type="range" :min="data.min" :max="data.max" />
      {{ filter.value.gte }} - {{ filter.value.lte }}
    </div>
    <button @click="onSelect">get rendered</button>
  </div>
</template>

<script>
/**
 * This example map deomnstrates the synchronization between multiple maps and selection sharing
 */

import API from '@/api/api';

import { WmMap, WmMapGeojson } from '../';

const transformGeojson = (geojson) => {
  let min = Infinity;
  let max = -Infinity;

  // HACK: remove no data value
  geojson.features = geojson.features.filter((feature) => feature.properties.value !== 0);

  geojson.features.forEach((feature) => {
    const properties = feature.properties;
    const value = properties.value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  });
  return {
    min,
    max,
    geojson,
  };
};

// polygon highlight layer template (read only)
const baseLayer = Object.freeze({
  type: 'fill',
  paint: {
    'fill-color': 'grey',
    'fill-opacity': 0.1,
  },
});

// mapbox style utility functions
const linearColorInterpolate = (property, domain, colorRange) => {
  return [
    'interpolate',
    ['linear'],
    ['get', property],
    domain[0],
    ['to-color', colorRange[0]],
    domain[1],
    ['to-color', colorRange[1]],
  ];
};
const createPolygonLayerStyle = (property, dataDomain, colorRange) => {
  return {
    type: 'fill',
    paint: {
      'fill-color': linearColorInterpolate(property, dataDomain, colorRange),
      'fill-opacity': 0.8,
    },
    filter: null,
  };
};

export default {
  name: 'FilterExample',
  components: {
    WmMap,
    WmMapGeojson,
  },
  data() {
    return {
      center: [0, 0],
      bearing: 0,
      zoom: 0,
      pitch: 0,
      data: null,
      mapData: null,
      filter: {
        value: { gte: 0, lte: 0 },
      },
    };
  },
  watch: {
    filter: {
      handler() {
        if (!this.mapData) return;
        this.mapData.layers.data.filter = this.createRangeFilter(this.filter.value);
      },
      deep: true,
    },
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      const { data } = await API.get(
        'maas/output/164c9686338a08c78b9efde2ab186d89f70540e024f4fd25c7ae1466834bc480?feature=management_practice&precision=5'
      );
      // const { data } = await API.get('maas/output/6715e20386756222c965646aa38004cf63140f5fc8ff50c7b39e5bcd287fda47?feature=poverty level&precision=5');
      this.data = transformGeojson(data.geojson);
      this.filter.value = { gte: this.data.min, lte: this.data.max };
      this.mapData = {
        source: this.data.geojson,
        layers: {
          data: createPolygonLayerStyle(
            'value',
            [this.data.min, this.data.max],
            ['#fee8c8', '#e34a33']
          ),
          base: { ...baseLayer },
        },
      };
    },
    async fetchOther() {},
    onLoad(event) {
      console.log('map load');
      console.log(event);
    },
    onSelect() {
      const map = this.$refs.wmmap.map;
      const features = map.queryRenderedFeatures({ layers: ['color-layer'] });
      const ids = features.map((feature) => feature.properties.id);
      console.log(ids);
    },
    createRangeFilter({ gte, lte }) {
      const lowerBound = ['>=', 'value', Number(gte)];
      const upperBound = ['<=', 'value', Number(lte)];
      return ['all', lowerBound, upperBound];
    },
  },
};
</script>

<style lang="scss" scoped></style>
