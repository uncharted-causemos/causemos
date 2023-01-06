<template>
  <div class="analysis-map-container">
    <wm-map v-bind="mapFixedOptions" :bounds="mapBounds" @load="onMapLoad">
      <wm-map-vector
        v-if="vectorSource"
        :source="vectorSource"
        :source-id="vectorSourceId"
        :source-layer="vectorSourceLayer"
        :promote-id="idPropName"
        :layer-id="baseLayerId"
        :layer="baseLayer"
      />

      <wm-map-bounding-box :bbox="bbox" />
    </wm-map>
  </div>
</template>

<script>
import _ from 'lodash';
import { WmMap, WmMapVector, WmMapBoundingBox } from '@/wm-map';
import { BASE_MAP_OPTIONS, ETHIOPIA_BOUNDING_BOX, STYLE_URL_PREFIX } from '@/utils/map-util';
import { BASE_LAYER } from '@/utils/map-util-new';
import { adminLevelToString } from '@/utils/admin-level-util';

// selectedLayer cycles one by one through these layers
const layers = Object.freeze(
  [0, 1, 2, 3].map((i) => ({
    vectorSourceLayer: `boundaries-adm${i}`,
    idPropName: { [`boundaries-adm${i}`]: 'id' },
  }))
);

const baseLayer = () => {
  return Object.freeze({
    type: 'fill',
    paint: {
      'fill-color': 'grey',
      'fill-outline-color': 'black',
      'fill-opacity': [
        'case',
        ['==', null, ['feature-state', 'selected']],
        0.0,
        ['boolean', ['feature-state', 'selected'], false],
        0.2,
        0.1, // default
      ],
    },
  });
};

export default {
  name: 'GeoSelectionMap',
  components: {
    WmMap,
    WmMapVector,
    WmMapBoundingBox,
  },
  props: {
    selectedLayerId: {
      type: Number,
      default: 0,
    },
    selectedRegion: {
      type: String,
      default: '',
    },
    bbox: {
      type: Array,
      default: () => [],
    },
    mapBounds: {
      // initial map bounds; default bounds to the bbox of the model country/countries
      type: Array,
      default: () => [
        [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
        [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP],
      ],
    },
  },
  data: () => ({
    baseLayer: undefined,
    map: undefined,
    extent: undefined,
  }),
  computed: {
    mapFixedOptions() {
      const options = {
        minZoom: 1,
        ...BASE_MAP_OPTIONS,
      };
      options.style = this.selectedBaseLayerEndpoint;
      options.mapStyle = this.selectedBaseLayerEndpoint;
      return options;
    },
    selectedLayer() {
      return layers[this.selectedLayerId];
    },
    vectorSourceLayer() {
      return this.selectedLayer?.vectorSourceLayer;
    },
    idPropName() {
      return this.selectedLayer?.idPropName;
    },
    adminLevel() {
      if (this.selectedLayerId > 3) return undefined;
      return adminLevelToString(this.selectedLayerId);
    },
    selectedBaseLayerEndpoint() {
      return `${STYLE_URL_PREFIX}${BASE_LAYER.DEFAULT}`;
    },
    vectorSource() {
      return `${window.location.protocol}/${window.location.host}/api/maas/tiles/cm-${this.selectedLayer.vectorSourceLayer}/{z}/{x}/{y}`;
    },
  },
  watch: {
    selectedLayer() {
      this.debouncedRefresh();
    },
    selectedRegion() {
      this.debouncedRefresh();
    },
    bbox() {
      if (!this.bbox || this.bbox.length === 0) return;
      const cameraOptions = {
        padding: 20, // pixels
        duration: 1000, // milliseconds
        essential: true, // this animation is considered essential with respect to prefers-reduced-motion
      };
      this.map.fitBounds(this.bbox, cameraOptions);
    },
  },
  created() {
    this.vectorSourceId = 'maas-vector-source';
    this.baseLayerId = 'base-layer';

    this.debouncedRefresh = _.debounce(function () {
      this.refresh();
    }, 50);

    // Init layer objects
    this.refreshLayers();
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      if (!this.map) return;
      this.refreshLayers();
      this.setFeatureStates();
    },
    refreshLayers() {
      this.baseLayer = baseLayer();
    },
    setFeatureStates() {
      if (!this.map || !this.adminLevel) return;

      // Remove all states of the source.
      this.map.removeFeatureState({
        source: this.vectorSourceId,
        sourceLayer: this.vectorSourceLayer,
      });

      // enable the map feature state based on the region name
      if (this.selectedRegion !== '') {
        this.map.setFeatureState(
          {
            id: this.selectedRegion,
            source: this.vectorSourceId,
            sourceLayer: this.vectorSourceLayer,
          },
          { selected: true }
        );
      }
    },
    onMapLoad(event) {
      const map = event.map;
      this.map = map;
      event.map.showTileBoundaries = false; // set to true for debugging

      // disable tilt and rotation of the map since theses are not working nicely with bound syncing
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();

      // Init layers
      this.refreshLayers();
    },
  },
};
</script>

<style lang="scss" scoped>
.analysis-map-container {
  position: relative;
}
</style>
