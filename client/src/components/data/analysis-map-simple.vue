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
        @click="isGridMap = !isGridMap">
        <i
          :class="layerButtonClass"
        />
      </div>
    </div>
    <wm-map
      v-bind="mapFixedOptions"
      :bounds="mapBounds"
      @load="onMapLoad"
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
import moment from 'moment';
import API from '@/api/api';
import { DEFAULT_MODEL_OUTPUT_COLOR_OPTION, modelOutputMaxPrecision } from '@/utils/model-output-util';
import { WmMap, WmMapVector, WmMapPopup } from '@/wm-map';
import { getColors } from '@/utils/colors-util';
import { BASE_MAP_OPTIONS, createHeatmapLayerStyle, ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';
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
  return Object.freeze({
    type: 'fill',
    paint: {
      'fill-antialias': useFeatureState,
      'fill-color': 'grey',
      'fill-opacity': [
        'case',
        ['==', ['number', [(useFeatureState ? 'feature-state' : 'get'), property], -10000], -10000],
        0.1,
        ['boolean', ['feature-state', 'hover'], false],
        0.4, // opacity to 0.4 on hover
        0.1 // default
      ]
    }
  });
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
    'slide-handle-change'
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
    mapBounds: {
      type: Array,
      default: () => [ // Default bounds to Ethiopia
        [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
        [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
      ]
    }
  },
  data: () => ({
    isGridMap: false,
    baseLayer: undefined,
    colorLayer: undefined,
    hoverId: undefined,
    lookupData: undefined,
    range: undefined,
    featuresDrawn: undefined,
    map: undefined,
    selectedLayer: undefined
  }),
  computed: {
    selection() {
      return this.outputSourceSpecs[this.outputSelection];
    },
    stats() {
      if (!this.lookupData) return;
      const stats = {};
      for (const [key, data] of Object.entries(this.lookupData)) {
        const values = data.map(v => v.value);
        stats[key] = { min: Math.min(...values), max: Math.max(...values) };
      }
      return stats;
    },
    extent() {
      const adminLevel = this.selectedAdminLevel === 0 ? 'country' : 'admin' + this.selectedAdminLevel;
      if (!this.stats) return { min: 0, max: 1 };
      return this.stats[adminLevel];
    },
    valueProp() {
      // Name of the value property of the feature to be rendered
      return (this.selection && this.selection.id) || '';
    },
    vectorSource() {
      if (this.selectedLayer.vectorSourceLayer !== 'maas') {
        return `${window.location.protocol}/${window.location.host}/api/maas/tiles/cm-${this.selectedLayer.vectorSourceLayer}/{z}/{x}/{y}`;
      } else {
        const outputSpecs = this.outputSourceSpecs.map(({ id, modelId, outputVariable, timestamp }) => ({ id, modelId, outputVariable, timestamp }))
          .filter(({ id, modelId, runId, outputVariable, timestamp }) => {
            // some models (eb. chirps) has timestamp as 0 for some reason and 0 should be treated as valid value
            // eg. {"timeseries":[{"timestamp":0,"value":-0.24032641113384878}]}
            return id && modelId && runId && outputVariable && !_.isNil(timestamp);
          })
          .map(select => {
            const modelName = select.model || '';
            const maxPrecision = modelOutputMaxPrecision[modelName];
            return {
              model: select.modelId,
              runId: select.runId,
              feature: select.outputVariable,
              date: moment(select.timestamp).toISOString(),
              valueProp: select.id,
              maxPrecision
            };
          });
        return `${window.location.protocol}/${window.location.host}/api/maas/output/tiles/{z}/{x}/{y}?specs=${JSON.stringify(outputSpecs)}`;
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
      this.range = this.filterRange;

      // Intilaize min max boundary value and data
      this.refreshData().then(() => {
        this.refreshLayers();
        this.updateLayerFilter();
      });
    },
    refreshLayers() {
      if (this.extent === undefined || this.colorOption === undefined) return;
      const useFeatureState = this.selectedLayer.vectorSourceLayer !== 'maas';
      this.baseLayer = baseLayer(this.valueProp, useFeatureState);
      const { min, max } = this.extent;
      const { color, scaleFn } = this.colorOption;
      this.colorLayer = createHeatmapLayerStyle(this.valueProp, [min, max], this.filterRange, getColors(color, 20), scaleFn, useFeatureState);
    },
    async refreshData() {
      const { runId, outputVariable, modelId, temporalResolution, temporalAggregation, spatialAggregation, timestamp } = this.selection || {};
      if (!runId || !outputVariable || !modelId || !timestamp) {
        return;
      }
      // TODO: Move this api request to service layer
      const data = (await API.get('/maas/output/regional-data', {
        params: {
          model_id: modelId,
          run_id: runId,
          feature: outputVariable,
          resolution: temporalResolution !== '' ? temporalResolution : 'month',
          temporal_agg: temporalAggregation !== '' ? temporalAggregation : 'mean',
          spatial_agg: spatialAggregation !== '' ? spatialAggregation : 'mean',
          timestamp
        }
      })).data;
      this.lookupData = data;
      if (this.map) this.setFeatureStates();
    },
    setFeatureStates() {
      const adminLevel = this.selectedAdminLevel === 0 ? 'country' : 'admin' + this.selectedAdminLevel;

      this.map.removeFeatureState({
        source: this.vectorSourceId,
        sourceLayer: this.vectorSourceLayer
      });

      this.lookupData[adminLevel].forEach(row => {
        this.map.setFeatureState({
          id: row.id.replaceAll('_', '__'),
          source: this.vectorSourceId,
          sourceLayer: this.vectorSourceLayer
        }, {
          [this.valueProp]: row.value // > 29000 ? 29000 : row.value
        });
      });
    },
    onAddLayer() {
      if (!this.lookupData) return;
      this.setFeatureStates();
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

      if (!this.showTooltip || _.isNil(map.getLayer(this.baseLayerId))) return;

      this._unsetHover(map);

      const features = map.queryRenderedFeatures(mapboxEvent.point, { layers: [this.baseLayerId, this.colorLayerId] });
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
        return chartValueFormatter([this.extent.min, this.extent.max])(feature.properties[this.valueProp]);
      } else {
        const fields = [chartValueFormatter([this.extent.min, this.extent.max])(feature.state[this.valueProp])];
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
    }, 1000 / FILTER_ANIMATION_FPS)
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
