<template>
  <div class="mini-map-container">
    <wm-map
      v-bind="mapFixedOptions"
      :bounds="mapBounds"
      @load="onMapLoad"
      @mousemove="onMouseMove"
      @click="onMapClick"
      @resize="onResize"
    >
      <wm-map-vector
        v-if="vectorSource"
        :source="vectorSource"
        :source-id="vectorSourceId"
        :source-layer="vectorSourceLayer"
        :source-maxzoom="vectorSourceMaxzoom"
        :promote-id="idPropName"
        :layer-id="colorLayerId"
        :layer="colorLayer"
        :before-id="firstSymbolLayerId"
        @add-layer="onAddLayer"
      />
      <wm-map-vector
        v-if="vectorSource"
        :source-id="vectorSourceId"
        :source-layer="vectorSourceLayer"
        :promote-id="idPropName"
        :layer-id="borderLayerId"
        :layer="borderLayer"
        :before-id="firstSymbolLayerId"
      />
      <wm-map-popup
        :layer-id="colorLayerId"
        :formatter-fn="popupFormatter"
        :cursor="'default'"
      />
    </wm-map>
  </div>
</template>

<script>

import _ from 'lodash';
import {
  defineComponent,
  toRefs,
  computed
} from 'vue';
import { WmMap, WmMapVector, WmMapPopup } from '@/wm-map';
import useMapRegionSelection from '@/services/composables/useMapRegionSelection';
import {
  BASE_MAP_OPTIONS,
  ETHIOPIA_BOUNDING_BOX,
  STYLE_URL_PREFIX
} from '@/utils/map-util';
import { SELECTED_COLOR } from '@/utils/colors-util';
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
      'fill-opacity': [
        'case',
        ['==', null, ['feature-state', 'label']], 0.0,
        ['==', null, ['feature-state', 'opacity']], 1,
        ['==', true, ['feature-state', '_isHidden']], 0.0,
        ['feature-state', 'opacity']
      ]
    }
  });
};

const borderLayer = () => {
  return Object.freeze({
    type: 'line',
    paint: {
      'line-color': [
        'case',
        ['==', null, ['feature-state', 'color']], 'rgba(0, 0, 0, 0)',
        ['==', true, ['feature-state', 'hover']], SELECTED_COLOR,
        ['==', true, ['feature-state', 'selected']], SELECTED_COLOR,
        'black'
      ],
      'line-width': [
        'case',
        ['==', true, ['feature-state', 'selected']], 2,
        ['==', true, ['feature-state', 'hover']], 1,
        0.1
      ],
      'line-opacity': [
        'case',
        ['==', null, ['feature-state', 'label']], 0.0,
        1
      ]
    }
  });
};

export default defineComponent({
  name: 'RegionMap',
  emits: ['click-region'],
  components: {
    WmMap,
    WmMapVector,
    WmMapPopup
  },
  props: {
    data: {
      type: Array,
      default: () => []
    },
    selectedId: {
      type: String,
      default: ''
    },
    regionFilter: {
      type: Object,
      default: () => ({ country: new Set(), admin1: new Set(), admin2: new Set(), admin3: new Set() })
    },
    selectedAdminLevel: {
      type: Number,
      default: 0
    },
    mapBounds: { // initial map bounds; default bounds to the bbox of the model country/countries
      type: [Array, Object],
      default: () => [
        [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
        [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
      ]
    },
    popupFormatter: {
      type: Function,
      default: (feature) => {
        const { label, name, value } = feature.state || {};
        if (!label) return null;
        return `${label.split('__').pop()}<br> Rank: ${name}<br> Value: ${+value.toFixed(2)}`;
      }
    },
    selectedRegionIds: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const {
      selectedAdminLevel,
      regionFilter
    } = toRefs(props);

    const selectedLayerId = computed(() => SOURCE_LAYERS[selectedAdminLevel.value].layerId);
    const { isRegionSelectionEmpty, isRegionSelected } = useMapRegionSelection(selectedLayerId, regionFilter);

    return {
      isRegionSelectionEmpty,
      isRegionSelected
    };
  },
  data: () => ({
    colorLayer: undefined,
    map: undefined,
    hoverId: undefined
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
      return SOURCE_LAYERS[this.selectedAdminLevel];
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
    },
    selectedId() {
      this.updateSelection();
    },
    regionFilter() {
      this.setFeatureStates();
    }
  },
  created() {
    this.vectorSourceId = 'maas-vector-source';
    this.colorLayerId = 'color-layer';
    this.borderLayerId = 'border-layer';
    this.firstSymbolLayerId = 'watername_ocean';
    this.vectorSourceMaxzoom = 8;

    // Init layer objects
    this.colorLayer = colorLayer();
    this.borderLayer = borderLayer();
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
          ...d,
          _isHidden: this.isRegionSelectionEmpty ? false : !this.isRegionSelected(d.label)
        });
      }
    },
    disablePanAndZoom() {
      const map = this.map;
      map.dragPan.disable();
      map.doubleClickZoom.disable();
      map.scrollZoom.disable();
    },
    onMapLoad(event) {
      const map = event.map;
      this.map = map;
      event.map.showTileBoundaries = false; // set to true for debugging

      // disable interactions
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      this.disablePanAndZoom();
    },
    onResize() {
      this.map.fitBounds(this.mapBounds.value || this.mapBounds, { duration: 0 });
    },
    onAddLayer() {
      // Triggered when the source layer has been updated or replaced with new one eg. when selected admin level changes
      this.hoverId = undefined;
      this.debouncedRefresh();
    },
    onMouseMove(event) {
      const { map, mapboxEvent } = event;
      if (_.isNil(map.getLayer(this.colorLayerId))) return;

      const hoverId = this.hoverId;
      if (hoverId) {
        map.removeFeatureState({ source: this.vectorSourceId, id: hoverId, sourceLayer: this.vectorSourceLayer }, 'hover');
      }

      const features = map.queryRenderedFeatures(mapboxEvent.point, { layers: [this.colorLayerId] });
      features.forEach(feature => {
        this.hoverId = feature.id;
        map.setFeatureState(
          { source: feature.source, id: feature.id, sourceLayer: this.vectorSourceLayer },
          { hover: true }
        );
      });
    },
    onMapClick(event) {
      const { map, mapboxEvent } = event;
      if (_.isNil(map.getLayer(this.colorLayerId))) return;
      const features = map.queryRenderedFeatures(mapboxEvent.point, { layers: [this.colorLayerId] });
      const regionId = features[0]?.state?.label || '';
      this.$emit('click-region', regionId);
    },
    updateSelection() {
      this.data.forEach(d => {
        this.map.removeFeatureState({ source: this.vectorSourceId, id: d.label, sourceLayer: this.vectorSourceLayer }, 'selected');
      });
      if (this.selectedId) {
        this.map.setFeatureState({ source: this.vectorSourceId, id: this.selectedId, sourceLayer: this.vectorSourceLayer }, { selected: true });
      }
    }
  }
});
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
