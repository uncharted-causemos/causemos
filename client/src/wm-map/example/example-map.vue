<template>
  <div style="display: flex; flex-wrap: wrap">
    <!-- Smal multiple maps -->
    <div v-for="data in mapData" :key="data.sourceId" style="height: 250px; width: 250px">
      <wm-map
        ref="mapComponents"
        :center="center"
        :zoom="zoom"
        :bearing="bearing"
        :pitch="pitch"
        :bounds="bounds"
        @click="onClick"
        @move="syncMove"
      >
        <wm-map-selectbox @select-box="onSelectBox" />
        <wm-map-geojson
          v-if="data"
          :source-id="data.sourceId"
          :source="data.source"
          :layer-id="data.sourceId + '-base'"
          :layer="data.layers.data"
        />
        <!-- Highlight layer shares same source data as data layer. Omit :source -->
        <wm-map-geojson
          v-if="data"
          :key="data.sourceId + 'highlights'"
          :source-id="data.sourceId"
          :layer-id="data.sourceId + '-highlights'"
          :layer="data.layers.highlights"
        />
      </wm-map>
    </div>

    <!-- Large map with all layers -->
    <div style="height: 500px; width: 500px">
      <wm-map
        :center="center"
        :zoom="zoom"
        :bearing="bearing"
        :pitch="pitch"
        :bounds="bounds"
        @move="syncMove"
      >
        <wm-map-selectbox @select-box="onSelectBox" />
        <template v-for="data in mapData" :key="data.sourceId">
          <wm-map-geojson
            :source-id="data.sourceId"
            :source="data.source"
            :layer-id="data.sourceId + '-base'"
            :layer="data.layers.data"
          />
          <!-- Highlight layer shares same source data as data layer. Omit :source -->
          <wm-map-geojson
            :source-id="data.sourceId"
            :layer-id="data.sourceId + '-highlights'"
            :layer="data.layers.highlights"
          />
        </template>
      </wm-map>
    </div>
    <filter-example />
  </div>
</template>

<script>
/**
 * This example map deomnstrates the synchronization between multiple maps and selection sharing
 */

import API from '@/api/api';
import { getColors, COLOR, SELECTED_COLOR } from '@/utils/colors-util';

import { WmMap, WmMapGeojson, WmMapSelectbox } from '../';
import FilterExample from './filter-example';
import pointsdata from './pointsdata';

const SYNC_BOUNDS = true;

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
const highlightsLayer = Object.freeze({
  type: 'fill',
  paint: {
    'fill-color': SELECTED_COLOR,
    'fill-opacity': 0.75,
  },
  filter: ['in', 'id', ''],
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
      'fill-opacity': 0.7,
    },
  };
};

export default {
  name: 'ExampleMap',
  components: {
    WmMap,
    WmMapGeojson,
    WmMapSelectbox,
    FilterExample,
  },
  data() {
    return {
      center: [0, 0],
      bearing: 0,
      zoom: 0,
      pitch: 0,
      bounds: null,
      mapData: [],
    };
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      const data = transformGeojson(pointsdata);
      const pointsLayer = {
        type: 'circle',
        paint: {
          'circle-color': linearColorInterpolate(
            'value',
            [data.min, data.max],
            ['#deebf7', '#3182bd']
          ),
        },
      };
      const pointsHighlihgtLayer = {
        type: 'circle',
        paint: {
          'circle-color': SELECTED_COLOR,
          'circle-opacity': 0.75,
        },
        filter: ['in', 'id', ''],
      };

      const [managementData, povertylevelData] = await Promise.all([
        API.get(
          'maas/output/164c9686338a08c78b9efde2ab186d89f70540e024f4fd25c7ae1466834bc480?feature=management_practice&precision=4'
        ),
        API.get(
          'maas/output/6715e20386756222c965646aa38004cf63140f5fc8ff50c7b39e5bcd287fda47?feature=poverty level&precision=4'
        ),
      ]);
      const management = transformGeojson(managementData.data.geojson);
      const poverty = transformGeojson(povertylevelData.data.geojson);

      this.mapData = [
        {
          sourceId: 'points',
          source: data.geojson,
          layers: {
            data: pointsLayer,
            highlights: { ...pointsHighlihgtLayer },
          },
        },
        {
          sourceId: 'management',
          source: management.geojson,
          layers: {
            data: createPolygonLayerStyle(
              'value',
              [management.min, management.max],
              ['#fee8c8', '#e34a33']
            ),
            highlights: { ...highlightsLayer },
          },
        },
        {
          sourceId: 'poverty',
          source: poverty.geojson,
          layers: {
            data: createPolygonLayerStyle(
              'value',
              [poverty.min, poverty.max],
              getColors(COLOR.WM_GREEN, 2)
            ),
            highlights: { ...highlightsLayer },
          },
        },
      ];
    },
    onSelectBox(event) {
      const lngLatBbox = event.bbox.map((point) => event.map.unproject(point));
      // update filter for highlight layer for all maps
      this.mapData.forEach((d, index) => {
        const map = this.$refs.mapComponents[index].map;
        // bbox in context of the current map
        const bbox = lngLatBbox.map((coords) => map.project(coords));
        const features = map.queryRenderedFeatures(bbox, { layers: [d.sourceId + '-base'] });
        // construct layer filter for highlight layer
        const filter = features.reduce(
          (memo, feature) => {
            memo.push(feature.properties.id);
            return memo;
          },
          ['in', 'id']
        );
        // update the filter
        d.layers.highlights.filter = filter;
      });
    },

    syncMove(event) {
      // Skip if move event is not originated from dom event (eg. not triggerd by user interaction with dom)
      // We ignore move events from other maps which are being synced with the master map to avoid situation
      // where they also trigger prop updates and fire events again to create infinite loop
      const originalEvent = event.mapboxEvent.originalEvent;
      if (!originalEvent) return;

      const map = event.map;
      const component = event.component;

      // Disable camera movment until next tick so that the master map doesn't get updated by the props change
      // Master map is being interacted by user so camera movment is already applied
      component.disableCamera();

      // get properties of the map and update vue props
      SYNC_BOUNDS ? this.syncBounds(map) : this.syncCamera(map);

      this.$nextTick(() => {
        component.enableCamera();
      });
    },
    syncCamera(map) {
      // You can also use vuex store to set following camera options to share among multiple components in differnet locations
      this.center = map.getCenter();
      this.zoom = map.getZoom();
      this.bearing = map.getBearing();
      this.pitch = map.getPitch();
    },
    syncBounds(map) {
      this.bounds = map.getBounds();
    },
    onClick(event) {
      console.log(event);
    },
  },
};
</script>
