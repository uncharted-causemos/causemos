<template>
  <wm-map
    ref="mapComponents"
    :bounds="mapBounds"
    v-bind="baseMapOptions"
    @load="disableDragRotate"
    @click="onClick"
  >
    <wm-map-geojson
      :source-id="layerSourceId"
      :source="mapGeoJson"
      :layer-id="layerId"
      :layer="pointLayer"
    />
    <wm-map-selectbox @select-box="onSelectBox" />
    <wm-map-popup
      v-if="showTooltip"
      :layer-id="layerId"
      :formatter-fn="formatterFn"
      :cursor="'pointer'"
    />
  </wm-map>
</template>

<script>

import _ from 'lodash';

import { WmMap, WmMapPopup, WmMapSelectbox, WmMapGeojson } from '@/wm-map';
import { BASE_MAP_OPTIONS } from '@/utils/map-util';

/**
 * Mapbox layer style configuration
 * - Use color `properties` to dynamically apply different colors
 *  (see doc: https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/)
 */
const createPointLayerStyle = () => {
  return {
    type: 'circle',
    paint: {
      'circle-radius': ['get', 'radius'],
      'circle-color': ['get', 'color'],
      'circle-stroke-color': ['get', 'color'],
      'circle-opacity': 0.6,
      'circle-stroke-width': 1
    },
    filter: ['all'] // no filter
  };
};

const EMPTY_GEOJSON = Object.freeze({
  type: 'FeatureCollection',
  features: []
});

export default {
  name: 'MapPoints',
  components: {
    WmMap,
    WmMapPopup,
    WmMapSelectbox,
    WmMapGeojson
  },
  props: {
    mapData: {
      type: Object,
      default: () => null
    },
    mapBounds: {
      type: Array,
      default: () => ([[-180, -90], [180, 90]])
    },
    /**
     * layer related props
     */
    layerId: {
      type: String,
      default: 'point-layer'
    },
    layerSourceId: {
      type: String,
      default: 'point-data'
    },
    /**
     * tooltip related props
     */
    showTooltip: {
      type: Boolean,
      default: false
    },
    formatterFn: {
      type: Function,
      required: true
    }
  },
  emits: ['select-location'],
  data: () => ({
    pointLayer: null
  }),
  computed: {
    isMapDataEmpty() {
      return _.isEmpty(_.get(this.mapData, 'features'));
    },
    mapGeoJson() {
      return this.isMapDataEmpty ? EMPTY_GEOJSON : this.mapData;
    }
  },
  created() {
    this.baseMapOptions = BASE_MAP_OPTIONS;
    this.pointLayer = createPointLayerStyle();
  },
  methods: {
    disableDragRotate(event) {
      const map = event.map;
      // disable tilt and rotation of the map until needed - Feb 20th
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
    },
    onClick(event) {
      const { map, mapboxEvent } = event;
      if (!mapboxEvent.originalEvent.shiftKey) { // ignore select box related clicks
        const features = map.queryRenderedFeatures(mapboxEvent.point, { layers: [this.layerId] });
        const selectedLocations = features.map(feature => feature.properties.name);
        this.$emit('select-location', selectedLocations);
      }
    },
    onSelectBox(event) {
      const { bbox, map } = event;
      const lngLatBbox = bbox.map(point => map.unproject(point));
      // bbox in context of the current map
      const bboxCoords = lngLatBbox.map(coords => map.project(coords));
      const features = map.queryRenderedFeatures(bboxCoords, { layers: [this.layerId] });
      const selectedLocations = features.reduce((map, feature) => {
        map.push(feature.properties.name);
        return map;
      }, []);

      this.$emit('select-location', selectedLocations);
    }
  }
};
</script>
