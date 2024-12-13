<template>
  <div class="mini-map-container">
    <wm-map
      v-bind="mapFixedOptions"
      :bounds="mapBounds"
      @load="onMapLoad"
      @mousemove="onMouseMove"
      @move="onMapMove"
      @click="onMapClick"
      @resize="onResize"
    >
      <wm-map-vector
        v-if="vectorSource"
        :source="vectorSource"
        :source-id="VECTOR_SOURCE_ID"
        :source-layer="vectorSourceLayer"
        :source-maxzoom="VECTOR_SOURCE_MAX_ZOOM"
        :promote-id="idPropName"
        :layer-id="COLOR_LAYER_ID"
        :layer="colorLayer"
        :before-id="FIRST_SYMBOL_LAYER_ID"
        @add-layer="onAddLayer"
      />
      <wm-map-vector
        v-if="vectorSource"
        :source-id="VECTOR_SOURCE_ID"
        :source-layer="vectorSourceLayer"
        :promote-id="idPropName"
        :layer-id="BORDER_LAYER_ID"
        :layer="borderLayer"
        :before-id="FIRST_SYMBOL_LAYER_ID"
      />
      <wm-map-popup
        v-if="!disablePopup"
        :layer-id="COLOR_LAYER_ID"
        :formatter-fn="popupFormatter"
        :cursor="'default'"
      />
    </wm-map>
    <div v-if="data.length === 0" class="no-data">No data</div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { toRefs, computed, watch, ref } from 'vue';
import { WmMap, WmMapVector, WmMapPopup } from '@/wm-map';
import useMapRegionSelection from '@/composables/useMapRegionSelection';
import useMapSyncBounds from '@/composables/useMapSyncBounds';
import { BASE_MAP_OPTIONS, ETHIOPIA_BOUNDING_BOX, STYLE_URL_PREFIX } from '@/utils/map-util';
import { SELECTED_COLOR } from '@/utils/colors-util';
import { BASE_LAYER, SOURCE_LAYERS } from '@/utils/map-util-new';
import { getFullRegionIdDisplayName } from '@/utils/admin-level-util';
import { MapBounds, RegionMapData } from '@/types/Common';
import { Map, MapGeoJSONFeature, MapMouseEvent } from 'maplibre-gl';
import { BarData } from '@/types/BarChart';

// Constants
const VECTOR_SOURCE_ID = 'maas-vector-source';
const COLOR_LAYER_ID = 'color-layer';
const BORDER_LAYER_ID = 'border-layer';
const FIRST_SYMBOL_LAYER_ID = 'watername_ocean';
const VECTOR_SOURCE_MAX_ZOOM = 8;

const colorLayer = Object.freeze({
  type: 'fill',
  paint: {
    'fill-antialias': true,
    'fill-color': [
      'case',
      ['==', null, ['feature-state', 'color']],
      'rgba(0, 0, 0, 0)',
      ['feature-state', 'color'],
    ],
    'fill-opacity': [
      'case',
      ['==', null, ['feature-state', 'label']],
      0.0,
      ['==', null, ['feature-state', 'opacity']],
      1,
      ['==', true, ['feature-state', '_isHidden']],
      0.0,
      ['feature-state', 'opacity'],
    ],
  },
});

const borderLayer = Object.freeze({
  type: 'line',
  paint: {
    'line-color': [
      'case',
      ['==', null, ['feature-state', 'color']],
      'rgba(0, 0, 0, 0)',
      ['==', true, ['feature-state', 'hover']],
      SELECTED_COLOR,
      ['==', true, ['feature-state', 'selected']],
      SELECTED_COLOR,
      'black',
    ],
    'line-width': [
      'case',
      ['==', true, ['feature-state', 'selected']],
      2,
      ['==', true, ['feature-state', 'hover']],
      4,
      0.1,
    ],
    'line-opacity': ['case', ['==', null, ['feature-state', 'label']], 0.0, 1],
  },
});

const emit = defineEmits<{
  (e: 'click-region', regionId: string): void;
  (e: 'sync-bounds', event: { map: Map; mapboxEvent: MapMouseEvent }): void;
  (e: 'region-hover', regionId: string | null): void;
}>();

const props = withDefaults(
  defineProps<{
    data: RegionMapData[] | BarData[];
    selectedId?: string | null;
    hoveredRegionId?: string | null;
    regionFilter?: {
      country: Set<string>;
      admin1: Set<string>;
      admin2: Set<string>;
      admin3: Set<string>;
    };
    selectedAdminLevel: number;
    minZoom?: number;
    mapBounds?: MapBounds;
    popupFormatter?: (feature: MapGeoJSONFeature) => string | null;
    disablePanZoom?: boolean;
    disablePopup?: boolean;
  }>(),
  {
    selectedId: '',
    regionFilter: () => ({
      country: new Set(),
      admin1: new Set(),
      admin2: new Set(),
      admin3: new Set(),
    }),
    minZoom: 1,
    // initial map bounds; default bounds to the bbox of the model country/countries
    mapBounds: () => [
      [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
      [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP],
    ],
    hoveredRegionId: null,
    selectedAdminLevel: 0,
    popupFormatter: (feature: MapGeoJSONFeature) => {
      const { label, name, value } = feature.state || {};
      if (!label) return null;
      return `${getFullRegionIdDisplayName(label)}<br> Rank: ${name}<br> Value: ${+value.toFixed(
        2
      )}`;
    },
    disablePanZoom: false,
    disablePopup: false,
  }
);
const { selectedAdminLevel, regionFilter } = toRefs(props);

const selectedLayerId = computed(() => SOURCE_LAYERS[selectedAdminLevel.value].layerId);
const { isRegionSelectionEmpty, isRegionSelected } = useMapRegionSelection(
  selectedLayerId,
  regionFilter
);

const { syncBounds } = useMapSyncBounds(emit);

const onMapMove = (event: MapMouseEvent) => syncBounds(event);

const map = ref<Map | undefined>();

const mapFixedOptions = computed(() => {
  const options = {
    minZoom: props.minZoom,
    ...BASE_MAP_OPTIONS,
  };
  options.style = selectedBaseLayerEndpoint.value;
  options.mapStyle = selectedBaseLayerEndpoint.value;
  return options;
});
const selectedLayer = computed(() => SOURCE_LAYERS[selectedAdminLevel.value]);
const vectorSourceLayer = computed(() => selectedLayer.value.layerId);
const idPropName = computed(() => ({ [`${selectedLayer.value.layerId}`]: 'id' }));
const selectedBaseLayerEndpoint = computed(() => `${STYLE_URL_PREFIX}${BASE_LAYER.DEFAULT}`);
const vectorSource = computed(
  () => `${window.location.protocol}/${window.location.host}/${selectedLayer.value.sourceBaseUrl}`
);
const refresh = () => {
  if (!map.value) return;
  setFeatureStates();
};
const debouncedRefresh = _.debounce(function () {
  refresh();
}, 50);
watch(() => props.data, debouncedRefresh);

const setFeatureStates = () => {
  if (!map.value) return;

  // Remove all states of the source.
  map.value.removeFeatureState({
    source: VECTOR_SOURCE_ID,
    sourceLayer: vectorSourceLayer.value,
  });

  // enable the map feature state based on the region name
  for (const d of props.data) {
    map.value.setFeatureState(
      {
        id: d.label,
        source: VECTOR_SOURCE_ID,
        sourceLayer: vectorSourceLayer.value,
      },
      {
        ...d,
        _isHidden: isRegionSelectionEmpty.value ? false : !isRegionSelected(d.label),
      }
    );
  }
};
watch(
  () => regionFilter.value,
  () => setFeatureStates(),
  { immediate: true }
);

const disablePanAndZoom = () => {
  map.value?.dragPan.disable();
  map.value?.doubleClickZoom.disable();
  map.value?.scrollZoom.disable();
};
const onMapLoad = (event: { map: Map }) => {
  const _map = event.map;
  map.value = _map;
  _map.showTileBoundaries = false; // set to true for debugging

  // disable interactions
  _map.dragRotate.disable();
  _map.touchZoomRotate.disableRotation();
  if (props.disablePanZoom) {
    disablePanAndZoom();
  }
};
const onResize = () => {
  if (map.value) {
    if (Array.isArray(props.mapBounds) || props.mapBounds === undefined) {
      map.value.fitBounds(props.mapBounds, { duration: 0 });
    } else {
      map.value.fitBounds(props.mapBounds.value, { duration: 0 });
    }
  }
};

// Hovered region
const hoverId = ref<string | null>(null);
const clearHoveredRegion = () => {
  const _hoverId = hoverId.value;
  if (_hoverId !== null && map.value) {
    map.value.removeFeatureState(
      { source: VECTOR_SOURCE_ID, id: _hoverId, sourceLayer: vectorSourceLayer.value },
      'hover'
    );
  }
};
const onAddLayer = () => {
  // Triggered when the source layer has been updated or replaced with new one eg. when selected admin level changes
  clearHoveredRegion();
  debouncedRefresh();
};
const setHoverId = (newHoverId: string | null) => {
  // Tell the map that the currently hovered region is not hovered anymore.
  clearHoveredRegion();
  hoverId.value = newHoverId;
  if (newHoverId === null || map.value === undefined) return;
  map.value.setFeatureState(
    { source: VECTOR_SOURCE_ID, id: newHoverId, sourceLayer: vectorSourceLayer.value },
    { hover: true }
  );
};
watch(
  () => props.hoveredRegionId,
  () => {
    setHoverId(props.hoveredRegionId);
  },
  { immediate: true }
);

const onMouseMove = (event: { map: Map; mapboxEvent: MapMouseEvent }) => {
  const { map, mapboxEvent } = event;
  if (_.isNil(map.getLayer(COLOR_LAYER_ID))) return;
  // Find any region that is under the cursor
  const features = map.queryRenderedFeatures(mapboxEvent.point, {
    layers: [COLOR_LAYER_ID],
  });
  emit('region-hover', features.length === 0 ? null : (features[0].id as string));
};
const onMapClick = (event: { map: Map; mapboxEvent: MapMouseEvent }) => {
  const { map, mapboxEvent } = event;
  if (_.isNil(map.getLayer(COLOR_LAYER_ID))) return;
  const features = map.queryRenderedFeatures(mapboxEvent.point, {
    layers: [COLOR_LAYER_ID],
  });
  const regionId = features[0]?.state?.label || '';
  emit('click-region', regionId);
};
const updateSelection = () => {
  if (map.value) {
    props.data.forEach((d) => {
      map.value?.removeFeatureState(
        { source: VECTOR_SOURCE_ID, id: d.label, sourceLayer: vectorSourceLayer.value },
        'selected'
      );
    });
    if (props.selectedId) {
      map.value.setFeatureState(
        {
          source: VECTOR_SOURCE_ID,
          id: props.selectedId,
          sourceLayer: vectorSourceLayer.value,
        },
        { selected: true }
      );
    }
  }
};
watch(
  () => props.selectedId,
  () => updateSelection(),
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.mini-map-container {
  position: relative;
  height: 100%;
  width: 100%;
}
:deep(.mapboxgl-ctrl-attrib) {
  display: none;
}

.no-data {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 0);
  background: white;
  font-style: italic;
  color: red;
  font-size: large;
}
</style>
