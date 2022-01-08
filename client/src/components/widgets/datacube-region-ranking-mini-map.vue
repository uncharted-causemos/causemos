<template>
  <div class="mini-map-container">
    <wm-map
      v-bind="mapFixedOptions"
      :bounds="mapBounds"
      @load="onMapLoad"
    >
      <wm-map-vector
        v-if="vectorSource"
        :source="vectorSource"
        :source-id="vectorSourceId"
        :source-layer="vectorSourceLayer"
        :promote-id="idPropName"
        :layer-id="colorLayerId"
        :layer="colorLayer"
        :before-id="firstSymbolLayerId"
        @add-layer="onAddLayer"
      />
    </wm-map>
  </div>
</template>

<script>

import _ from 'lodash';
import { WmMap, WmMapVector } from '@/wm-map';
import {
  BASE_MAP_OPTIONS,
  ETHIOPIA_BOUNDING_BOX,
  STYLE_URL_PREFIX
} from '@/utils/map-util';
import { BASE_LAYER, SOURCE_LAYERS } from '@/utils/map-util-new';

const colorLayer = () => {
  return Object.freeze({
    type: 'fill',
    paint: {
      'fill-antialias': true,
      'fill-color': [
        'case',
        ['==', null, ['feature-state', 'color']], 'rgba(0, 0, 0, 0)',
        ['feature-state', 'color']
      ],
      'fill-outline-color': 'black',
      'fill-opacity': [
        'case',
        ['==', null, ['feature-state', 'label']], 0.0,
        1
      ]
    }
  });
};

export default {
  name: 'GeoSelectionMap',
  components: {
    WmMap,
    WmMapVector
  },
  props: {
    data: {
      type: Array,
      default: () => []
    },
    selectedLayerId: {
      type: Number,
      default: 0
    },
    mapBounds: { // initial map bounds; default bounds to the bbox of the model country/countries
      type: Array,
      default: () => [
        [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
        [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
      ]
    }
  },
  data: () => ({
    colorLayer: undefined,
    map: undefined
  }),
  computed: {
    mapFixedOptions() {
      const options = {
        minZoom: 1,
        ...BASE_MAP_OPTIONS
      };
      options.style = this.selectedBaseLayerEndpoint;
      options.mapStyle = this.selectedBaseLayerEndpoint;
      return options;
    },
    selectedLayer() {
      return SOURCE_LAYERS[this.selectedLayerId];
    },
    vectorSourceLayer() {
      return this.selectedLayer.layerId;
    },
    idPropName() {
      return { [`${this.selectedLayer.layerId}`]: 'id' };
    },
    selectedBaseLayerEndpoint() {
      return `${STYLE_URL_PREFIX}${BASE_LAYER.DEFAULT}`;
    },
    vectorSource() {
      return `${window.location.protocol}/${window.location.host}/${this.selectedLayer.sourceBaseUrl}`;
    }
  },
  watch: {
    data() {
      this.debouncedRefresh();
    }
  },
  created() {
    this.vectorSourceId = 'maas-vector-source';
    this.colorLayerId = 'color-layer';
    this.firstSymbolLayerId = 'watername_ocean';
    // Init layer objects
    this.colorLayer = colorLayer();
    this.debouncedRefresh = _.debounce(function() {
      this.refresh();
    }, 50);
  },
  methods: {
    refresh() {
      if (!this.map) return;
      this.setFeatureStates();
    },
    setFeatureStates() {
      if (!this.map) return;

      // Remove all states of the source.
      this.map.removeFeatureState({
        source: this.vectorSourceId,
        sourceLayer: this.vectorSourceLayer
      });

      // enable the map feature state based on the region name
      for (const d of this.data) {
        this.map.setFeatureState({
          id: d.label,
          source: this.vectorSourceId,
          sourceLayer: this.vectorSourceLayer
        }, {
          ...d
        });
      }
    },
    onMapLoad(event) {
      const map = event.map;
      this.map = map;
      event.map.showTileBoundaries = false; // set to true for debugging

      // disable tilt and rotation of the map since theses are not working nicely with bound syncing
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
    },
    onAddLayer() {
      // Triggered when the source layer has been updated or replaced with new one eg. when selected admin level changes
      this.debouncedRefresh();
    }
  }
};
</script>

<style lang="scss" scoped>
.mini-map-container {
  position: relative;
  height: 100%;
  width: 100%;
}
::v-deep(.mapboxgl-ctrl-attrib) {
  display: none;

}
</style>
