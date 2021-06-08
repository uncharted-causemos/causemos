<template>
  <div class="analysis-map-container">
    <div class="value-filter">
      <slider-continuous-range
        v-if="extent"
        v-model="range"
        :min="extent.min"
        :max="extent.max"
        :color-option="colorOption"
      />
      <div
        class="layer-toggle-button"
        @click="clickLayerToggle">
        <i
          :class="layerButtonClass"
        />
      </div>
    </div>
    <wm-map
      v-bind="mapFixedOptions"
      :bounds="mapBounds"
      @load="onMapLoad"
      @move="onMapMove"
      @mousemove="onMouseMove"
      @mouseout="onMouseOut"
    >
      <wm-map-vector
        v-if="vectorSource"
        :source-id="vectorSourceId"
        :source="vectorSource"
        :source-layer="vectorSourceLayer"
        :source-maxzoom="vectorSourceMaxzoom"
        :promote-id="idPropName"
        :layer-id="colorLayerId"
        :layer="colorLayer"
        @add-layer="onAddLayer"
        @update-source="onUpdateSource"
      />
      <wm-map-vector
        v-if="vectorSource"
        :source-id="vectorSourceId"
        :source-layer="vectorSourceLayer"
        :promote-id="idPropName"
        :layer-id="baseLayerId"
        :layer="baseLayer"
      />
      <wm-map-popup
        v-if="showTooltip"
        :layer-id="baseLayerId"
        :formatter-fn="popupValueFormatter"
        :cursor="'default'"
      />
    </wm-map>
  </div>
</template>

<script>

import _ from 'lodash';
import { DEFAULT_MODEL_OUTPUT_COLOR_OPTION } from '@/utils/model-output-util';
import { WmMap, WmMapVector, WmMapPopup } from '@/wm-map';
import { getColors } from '@/utils/colors-util';
import { BASE_MAP_OPTIONS, createHeatmapLayerStyle, ETHIOPIA_BOUNDING_BOX, isLayerLoaded } from '@/utils/map-util';
import { chartValueFormatter } from '@/utils/string-util';
import SliderContinuousRange from '@/components/widgets/slider-continuous-range';

// Map filter animation fps rate (Use lower value if there's a performance issue)
const FILTER_ANIMATION_FPS = 5;

// selectedLayer cycles one by one through these layers
const layers = Object.freeze([0, 1, 2, 3].map(i => ({
  vectorSourceLayer: `boundaries-adm${i}`,
  idPropName: { [`boundaries-adm${i}`]: 'id' }
})).concat({
  vectorSourceLayer: 'maas',
  idPropName: { maas: 'id' }
}));

const createRangeFilter = ({ min, max }, prop) => {
  const lowerBound = ['>=', prop, Number(min)];
  const upperBound = ['<=', prop, Number(max)];
  return [lowerBound, upperBound];
};

const baseLayer = (property, useFeatureState = false) => {
  if (useFeatureState) {
    return Object.freeze({
      type: 'fill',
      paint: {
        'fill-antialias': true,
        'fill-color': 'grey',
        'fill-opacity': [
          'case',
          ['==', ['number', ['feature-state', property], -10000], -10000],
          0,
          ['boolean', ['feature-state', 'hover'], false],
          0.4, // opacity to 0.4 on hover
          0.1 // default
        ]
      }
    });
  } else {
    return Object.freeze({
      type: 'fill',
      paint: {
        'fill-antialias': false,
        'fill-color': 'grey',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.4, // opacity to 0.4 on hover
          0.1 // default
        ]
      },
      filter: ['all', ['has', property]]
    });
  }
};

export default {
  name: 'AnalysisMap',
  components: {
    WmMap,
    WmMapVector,
    WmMapPopup,
    SliderContinuousRange
  },
  emits: [
    'on-map-load',
    'aggregation-level-change',
    'slide-handle-change',
    'sync-bounds',
    'click-layer-toggle'
  ],
  props: {
    // Provide multiple ouput source specs in order to fetch map tiles or data that includes multiple output data (eg. multiple runs, different model ouputs etc.)
    outputSourceSpecs: {
      type: Array,
      default: () => []
    },
    outputSelection: {
      type: Number,
      default: () => 0
    },
    showTooltip: {
      type: Boolean,
      default: false
    },
    selectedAdminLevel: {
      type: Number,
      default: 0
    },
    filters: {
      type: Array,
      default: () => []
    },
    isGridMap: {
      type: Boolean,
      default: () => false
    },
    mapBounds: {
      type: Array,
      default: () => [ // Default bounds to Ethiopia
        [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
        [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
      ]
    },
    regionData: {
      type: Object,
      default: () => null
    }
  },
  data: () => ({
    baseLayer: undefined,
    colorLayer: undefined,
    hoverId: undefined,
    range: undefined,
    featuresDrawn: undefined,
    map: undefined,
    selectedLayer: undefined,
    gridStats: { min: 0, max: 1 }
  }),
  computed: {
    outputSourceSpecsValidated() {
      return this.outputSourceSpecs.filter(spec => {
        const { modelId, runId, outputVariable, timestamp, id, temporalResolution, temporalAggregation, spatialAggregation } = spec || {};
        return modelId && runId && outputVariable && timestamp && id && temporalResolution && temporalAggregation && spatialAggregation;
      });
    },
    selection() {
      return this.outputSourceSpecsValidated[this.outputSelection];
    },
    stats() {
      const stats = {};
      if (!this.regionData) return stats;
      for (const [key, data] of Object.entries(this.regionData)) {
        const values = data.filter(v => v[this.valueProp] !== undefined).map(v => v[this.valueProp]);
        if (values.length === 0) return stats;
        stats[key] = { min: Math.min(...values), max: Math.max(...values) };
      }
      return stats;
    },
    extent() {
      const adminLevel = this.selectedAdminLevel === 0 ? 'country' : 'admin' + this.selectedAdminLevel;
      const extent = this.isGridMap ? this.gridStats : this.stats[adminLevel];
      if (!extent) return { min: 0, max: 1 };
      if (extent.min === extent.max) {
        extent.min = 0;
      }
      return extent;
    },
    valueProp() {
      // Name of the value property of the feature to be rendered
      return (this.selection && this.selection.id) || '';
    },
    vectorSource() {
      if (this.selectedLayer.vectorSourceLayer !== 'maas') {
        return `${window.location.protocol}/${window.location.host}/api/maas/tiles/cm-${this.selectedLayer.vectorSourceLayer}/{z}/{x}/{y}`;
      } else {
        const outputSpecs = this.outputSourceSpecsValidated
          .map(spec => {
            return {
              modelId: spec.modelId,
              runId: spec.runId,
              feature: spec.outputVariable,
              timestamp: spec.timestamp,
              valueProp: spec.id,
              resolution: spec.temporalResolution,
              temporalAgg: spec.temporalAggregation,
              spatialAgg: spec.spatialAggregation
            };
          });
        return `${window.location.protocol}/${window.location.host}/api/maas/tiles/grid-output/{z}/{x}/{y}?specs=${JSON.stringify(outputSpecs)}`;
      }
    },
    layerButtonClass() {
      if (this.isGridMap) {
        return 'fa fa-th-large';
      }
      return 'fa fa-globe';
    },
    colorOption() {
      return DEFAULT_MODEL_OUTPUT_COLOR_OPTION;
    },
    filter() {
      return this.filters.find(filter => filter.id === this.valueProp);
    },
    isFilterGlobal() {
      return this.filter && this.filter.global;
    },
    filterRange() {
      if (this.filter === undefined) {
        return this.extent;
      }
      return this.filter && this.filter.range;
    }
  },
  watch: {
    filters() {
      this.updateLayerFilter();
    },
    selection() {
      this.refresh();
    },
    regionData() {
      this.refresh();
    },
    range: {
      handler() {
        this.updateFilterRange();
      },
      deep: true
    },
    selectedLayer() {
      Object.assign(this, this.selectedLayer);
      this.refreshLayers();
    },
    isGridMap() {
      this.setSelectedLayer();
    },
    selectedAdminLevel() {
      this.setSelectedLayer();
    }
  },
  created() {
    this.mapFixedOptions = {
      minZoom: 1,
      ...BASE_MAP_OPTIONS
    };

    this.vectorSourceId = 'maas-vector-source';
    this.selectedLayer = layers[this.selectedAdminLevel];
    this.vectorSourceMaxzoom = 8;
    this.colorLayerId = 'color-layer';
    this.baseLayerId = 'base-layer';
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      if (!this.map || !this.selection) return;
      this.range = this.filterRange;

      this.setFeatureStates();
      this.refreshLayers();
      this.updateLayerFilter();
    },
    refreshLayers() {
      if (this.extent === undefined || this.colorOption === undefined) return;
      const useFeatureState = this.selectedLayer.vectorSourceLayer !== 'maas';
      this.baseLayer = baseLayer(this.valueProp, useFeatureState);
      const { min, max } = this.extent;
      const { color, scaleFn } = this.colorOption;
      this.colorLayer = createHeatmapLayerStyle(this.valueProp, [min, max], this.filterRange, getColors(color, 20), scaleFn, useFeatureState);
    },
    refreshScale() {
      const { min, max } = this.extent;
      const { color, scaleFn } = this.colorOption;
      this.colorLayer = createHeatmapLayerStyle(this.valueProp, [min, max], this.filterRange, getColors(color, 20), scaleFn, false);
    },
    setFeatureStates() {
      const adminLevel = this.selectedAdminLevel === 0 ? 'country' : 'admin' + this.selectedAdminLevel;

      this.map.removeFeatureState({
        source: this.vectorSourceId,
        sourceLayer: this.vectorSourceLayer
      });

      this.regionData[adminLevel].forEach(row => {
        this.map.setFeatureState({
          id: row.id,
          source: this.vectorSourceId,
          sourceLayer: this.vectorSourceLayer
        }, {
          [this.valueProp]: row[this.valueProp]
        });
      });
    },
    onAddLayer() {
      if (!this.regionData) return;
      this.setFeatureStates();
    },
    onUpdateSource() {
      setTimeout(() => {
        // Hack: give enough time to map to render features from updated source
        this.reevaluateColourScale();
      }, 1000);
    },
    onMapLoad(event) {
      const map = event.map;
      this.map = map;
      event.map.showTileBoundaries = false; // set to true for debugging

      // disable tilt and rotation of the map since theses are not working nicely with bound syncing
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      this.$emit('on-map-load');
    },
    onMapMove(event) {
      this.throttledReevaluateColourScale();
      this.syncBounds(event);
    },
    syncBounds(event) {
      // Skip if move event is not originated from dom event (eg. not triggered by user interaction with dom)
      // We ignore move events from other maps which are being synced with the master map to avoid situation
      // where they also trigger prop updates and fire events again to create infinite loop
      const originalEvent = event.mapboxEvent.originalEvent;
      if (!originalEvent) return;

      const map = event.map;
      const component = event.component;

      // Disable camera movement until next tick so that the master map doesn't get updated by the props change
      // Master map is being interacted by user so camera movement is already applied
      component.disableCamera();

      this.$emit('sync-bounds', map.getBounds().toArray());

      this.$nextTick(() => {
        component.enableCamera();
      });
    },
    clickLayerToggle() {
      this.$emit('click-layer-toggle', { isGridMap: this.isGridMap });
    },
    updateLayerFilter() {
      if (!this.colorLayer) return;
      // Merge filter for the current map and all globally applied filters together
      if (this.selectedLayer.vectorSourceLayer === 'maas') {
        const filter = this.filters.reduce((prev, cur) => {
          if (cur.id !== this.valueProp && !cur.global) return prev;
          return [...prev, ...createRangeFilter(cur.range, cur.id)];
        }, []);
        this.colorLayer.filter = ['all', ['has', this.valueProp], ...filter];
      } else {
        this.refreshLayers();
      }
    },
    _setLayerHover(map, feature) {
      // unset previous state and hoveredId can be 0
      map.setFeatureState(
        { source: feature.source, id: feature.id, sourceLayer: this.vectorSourceLayer },
        { hover: true }
      );
      this.hoverId = feature.id;
    },
    _unsetHover(map) {
      if (!this.hoverId) return;
      map.removeFeatureState({ source: this.vectorSourceId, id: this.hoverId, sourceLayer: this.vectorSourceLayer }, 'hover');
      this.hoverId = undefined;
    },
    onMouseMove(event) {
      const { map, mapboxEvent } = event;

      if (!this.showTooltip ||
        _.isNil(map.getLayer(this.baseLayerId)) ||
        _.isNil(map.getLayer(this.colorLayerId))) return;

      this._unsetHover(map);

      const supportedLayers = [this.baseLayerId, this.colorLayerId];
      const features = map.queryRenderedFeatures(mapboxEvent.point, { layers: supportedLayers });
      features.forEach(feature => {
        this._setLayerHover(map, feature);
      });
    },
    onMouseOut(event) {
      if (!this.showTooltip) return;
      // reset hover feature state when mouse moves out of the map
      this._unsetHover(event.map);
    },
    popupValueFormatter(feature) {
      if (_.isNil(feature)) return null;
      if (_.isNil(feature.properties[this.valueProp]) && _.isNil(feature.state[this.valueProp])) return null;

      if (this.selectedLayer.vectorSourceLayer === 'maas') {
        return chartValueFormatter(this.extent.min, this.extent.max)(feature.properties[this.valueProp]);
      } else {
        const fields = [chartValueFormatter(this.extent.min, this.extent.max)(feature.state[this.valueProp])];
        [3, 2, 1, 0].forEach(i => fields.push(feature.properties['NAME_' + i]));
        return fields.filter(field => !_.isNil(field)).join('<br />');
      }
    },
    setSelectedLayer() {
      this.selectedLayer = this.isGridMap ? layers[4] : layers[this.selectedAdminLevel];
    },
    updateFilterRange: _.throttle(function () {
      if (!this.range || !this.valueProp) return;
      this.$emit('slide-handle-change', { id: this.valueProp, range: this.range });
    }, 1000 / FILTER_ANIMATION_FPS),
    throttledReevaluateColourScale: _.throttle(
      function() { this.reevaluateColourScale(); },
      100,
      { trailing: true, leading: true }
    ),
    // Dynamically calculate min max stats for grid map
    reevaluateColourScale() {
      if (!this.map) return;
      // Exit early if the layer hasn't finished loading
      if (!isLayerLoaded(this.map, this.baseLayerId)) return;
      // This only applies too grid map
      if (this.selectedLayer.vectorSourceLayer !== 'maas') return;
      const features = this.map.queryRenderedFeatures({ layers: [this.baseLayerId] });
      const values = [];
      for (const feature of features) {
        const value = feature.properties[this.valueProp];
        if (value !== undefined) values.push(value);
      }
      if (values.length === 0) {
        this.gridStats = { min: 0, max: 1 };
      } else {
        const min = Math.min(...values);
        const max = Math.max(...values);
        this.gridStats = { min, max };
      }
      this.refreshScale();
      this.updateLayerFilter();
    }
  }
};
</script>

<style lang="scss" scoped>
.analysis-map-container {
  position: relative;
}
.value-filter {
  position: absolute;
  right: 5px;
  top: 5px;
  padding: 5px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  cursor: pointer;
  .filter-toggle-button {
    padding: 5px;
    border: 1px solid #888;
    border-radius: 3px;
    background-color: #ccc;
    &.active {
      background-color: #6FC5DE;
    }
  }
  .layer-toggle-button {
    padding: 5px;
    border: 1px solid #888;
    border-radius: 3px;
    background-color: #ccc;
    &.active {
      background-color: #6FC5DE;
    }
  }
}
</style>
