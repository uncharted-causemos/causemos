<template>
  <div class="analysis-map-container">
    <div class="value-filter">
      <div
        class="filter-toggle-button"
        :class="{ active: !!isFilterGlobal }"
        @click="toggleFilterGlobal">
        <i class="fa fa-filter" />
      </div>
      <slider-continuous-range
        v-if="extent"
        v-model="range"
        :min="extent.min"
        :max="extent.max"
        :color-option="colorOption"
      />
      <div
        class="layer-toggle-button"
        @click="nextLayer">
        <i
          :class="layerButtonClass"
        />
      </div>
    </div>
    <wm-map
      v-bind="mapFixedOptions"
      :bounds="mapBounds"
      @move="syncBounds"
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
import { mapActions, mapGetters } from 'vuex';
import API from '@/api/api';
import { DEFAULT_MODEL_OUTPUT_COLOR_OPTION, modelOutputMaxPrecision } from '@/utils/model-output-util';
import { WmMap, WmMapVector, WmMapPopup } from '@/wm-map';
import { getColors } from '@/utils/colors-util';
import { BASE_MAP_OPTIONS, createHeatmapLayerStyle, ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';
import { chartValueFormatter } from '@/utils/string-util';
import SliderContinuousRange from '@/components/widgets/slider-continuous-range';

// Map filter animation fps rate (Use lower value if there's a performance issue)
const FILTER_ANIMATION_FPS = 15;

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
    'aggregation-level-change'
  ],
  props: {
    // A model ouput selection object
    selection: {
      type: Object,
      default: () => undefined
    },
    showTooltip: {
      type: Boolean,
      default: false
    },
    selectedAdminLevel: {
      type: Number,
      default: 0
    },
    selectedTimestamp: {
      type: Number,
      default: 0
    }
  },
  data: () => ({
    baseLayer: undefined,
    colorLayer: undefined,
    hoverId: undefined,
    extent: undefined,
    range: undefined,
    featuresDrawn: undefined,
    selectedData: undefined,
    map: undefined,
    selectedLayer: undefined
  }),
  computed: {
    ...mapGetters({
      mapBounds: 'dataAnalysis/mapBounds',
      analysisItems: 'dataAnalysis/analysisItems',
      selectedBaseLayer: 'map/selectedBaseLayer',
      selectedFirstLayer: 'map/selectedFirstLayer'
    }),
    filters() {
      return this.analysisItems.filter(item => !!item.filter)
        .map(({ id, filter }) => ({ id, ...filter }));
    },
    valueProp() {
      // Name of the value property of the feature to be rendered
      return (this.selection && this.selection.id) || '';
    },
    formattedMapBounds() {
      // FIXME: This is not really relavant with new tile map. This be no longer be needed once stats api is updated.
      // Default bounds to Ethiopia
      const top = _.get(this.mapBounds, '_ne.lat', ETHIOPIA_BOUNDING_BOX.TOP);
      const left = _.get(this.mapBounds, '_sw.lng', ETHIOPIA_BOUNDING_BOX.LEFT);
      const bottom = _.get(this.mapBounds, '_sw.lat', ETHIOPIA_BOUNDING_BOX.BOTTOM);
      const right = _.get(this.mapBounds, '_ne.lng', ETHIOPIA_BOUNDING_BOX.RIGHT);
      return {
        top,
        left,
        bottom,
        right
      };
    },
    vectorSource() {
      if (this.selectedLayer.vectorSourceLayer !== 'maas') {
        return `${window.location.protocol}/${window.location.host}/api/maas/tiles/cm-${this.selectedLayer.vectorSourceLayer}/{z}/{x}/{y}`;
      } else {
        const outputSpecs = this.analysisItems.map(({ id, modelId, model, outputVariable, selection }) => ({ id, modelId, model, outputVariable, ...selection }))
          .filter(({ id, modelId, runId, outputVariable, timestamp }) => {
            // some models (eb. chirps) has timestamp as 0 for some reason and 0 should be treated as valid value
            // eg. {"timeseries":[{"timestamp":0,"value":-0.24032641113384878}]}
            return id && modelId && runId && outputVariable !== '' && !_.isNil(timestamp);
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
      if (this.selectedLayer.vectorSourceLayer === 'maas') {
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
      // TODO: FIXME: HACKJOB: no filter likely because no analysisItems
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
    selectedAdminLevel() {
      this.selectedLayer = layers[this.selectedAdminLevel];
    },
    selectedTimestamp() {
      this.setFeatureStates();
    },
    selectedData() {
      this.refreshLayers();
      this.updateLayerFilter();
    }
  },
  created() {
    this.mapFixedOptions = {
      minZoom: 1,
      ...BASE_MAP_OPTIONS
    };
    // TODO: Add a line of code here to change the base map options to satellite/default
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
    ...mapActions({
      setMapBounds: 'dataAnalysis/setMapBounds',
      updateFilter: 'dataAnalysis/updateFilter'
    }),
    refresh() {
      this.range = this.filterRange;

      this.refreshData();

      // Intilaize min max boundary value
      this.updateStats().then(() => {
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
    async updateStats() {
      const { runId, outputVariable, modelId } = this.selection || {};
      if (!runId || !outputVariable || !modelId) {
        return;
      }
      // FIXME: This is old api call that accepts bounds and returns stats calculated based on geohash grids. Result won't quite match with current geotiled vector map ouput
      // We need to update the api so we get the stats based on geotile gtrid. Ideally we need to get the stats for all available zoom (precision) levels in single request
      const stats = (await API.get(`/maas/output/${runId}/stats`, {
        params: {
          feature: outputVariable,
          model: modelId,
          ...this.formattedMapBounds
        }
      })).data;
      this.extent = {
        min: stats.min,
        max: stats.max
      };
    },
    async refreshData() {
      const { runId, modelId } = this.selection || {};

      const promises = [];

      promises.push(API.get('fetch-demo-data', {
        params: {
          modelId,
          runId,
          type: 'regional-data'
        }
      }));

      const allRegionalData = (await Promise.all(promises)).map(response =>
        _.isEmpty(response.data) ? {} : JSON.parse(response.data)
      );
      if (_.some(allRegionalData, response => _.isEmpty(response))) {
        return;
      }

      this.selectedData = allRegionalData[0];
      this.setFeatureStates();
    },
    setFeatureStates() {
      const adminLevel = this.selectedAdminLevel === 0 ? 'country' : 'admin' + this.selectedAdminLevel;

      if (this.featuresDrawn !== undefined) {
        this.featuresDrawn.forEach(id => {
          this.map.removeFeatureState({
            id,
            source: this.vectorSourceId,
            sourceLayer: this.vectorSourceLayer
          });
        });
      }

      this.featuresDrawn = [];

      if (this.selectedData !== undefined && this.selectedData[adminLevel] !== undefined && this.selectedData[adminLevel][this.selectedTimestamp] !== undefined) {
        this.selectedData[adminLevel][this.selectedTimestamp].forEach(row => {
          this.featuresDrawn.push(row.id.replaceAll('_', '__'));
          this.map.setFeatureState({
            id: row.id.replaceAll('_', '__'),
            source: this.vectorSourceId,
            sourceLayer: this.vectorSourceLayer
          }, {
            [this.valueProp]: row.value // > 29000 ? 29000 : row.value
          });
        });
      }
    },
    onAddLayer(event) {
      if (this.selectedData !== undefined) {
        this.setFeatureStates(event.map, this.valueProp, this.selectedData);
      }
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

      // get properties of the map and update vue props
      this.setMapBounds(map.getBounds().toArray());

      this.$nextTick(() => {
        component.enableCamera();
      });
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
        this.colorLayer.filter = ['all', true];
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
    toggleFilterGlobal() {
      this.updateFilter({
        analysisItemId: this.valueProp,
        filter: { global: !this.isFilterGlobal }
      });
    },
    nextLayer() {
      // find current layer in layers and set it to the next one
      const layerIndex = layers.map(layer => {
        return this.selectedLayer.vectorSourceLayer === layer.vectorSourceLayer;
      }).indexOf(true);

      if (layerIndex >= layers.length - 1) {
        this.selectedLayer = layers[0];
      } else {
        this.selectedLayer = layers[layerIndex + 1];
      }

      this.$emit('aggregation-level-change', layerIndex);
    },
    updateFilterRange: _.throttle(function () {
      if (!this.range || !this.valueProp) return;
      this.updateFilter({
        analysisItemId: this.valueProp,
        filter: { range: this.range }
      });
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
