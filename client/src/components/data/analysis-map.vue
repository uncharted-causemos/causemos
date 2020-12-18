<template>
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
    />
    <wm-map-vector
      v-if="vectorSource"
      :source-id="vectorSourceId"
      :source-layer="vectorSourceLayer"
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
</template>

<script>

import _ from 'lodash';
import moment from 'moment';
import { mapActions, mapGetters } from 'vuex';
import API from '@/api/api';
import { getModelOutputColorOption, modelOutputMaxPrecision } from '@/utils/model-output-util';
import { ETHIOPIA_BOUNDING_BOX } from '@/utils/geo-util';
import { WmMap, WmMapVector, WmMapPopup } from '@/wm-map';
import { getColors } from '@/utils/colors-util';
import { BASE_MAP_OPTIONS, createHeatmapLayerStyle } from '@/utils/map-utils';
import { chartValueFormatter } from '@/utils/string-util';

const DEFAULT_EXTENT = { min: 0, max: 1 };
const EXTENT_UPDATE_EVENT = 'update-extent';

const createRangeFilter = ({ min, max }, prop) => {
  const lowerBound = ['>=', prop, Number(min)];
  const upperBound = ['<=', prop, Number(max)];
  return [lowerBound, upperBound];
};

const baseLayer = (property) => {
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
};

export default {
  name: 'AnalysisMap',
  components: {
    WmMap,
    WmMapVector,
    WmMapPopup
  },
  props: {
    // A model ouput selection object
    selection: {
      type: Object,
      default: () => undefined
    },
    showTooltip: {
      type: Boolean,
      default: false
    }
  },
  data: () => ({
    baseLayer: undefined,
    colorLayer: undefined,
    hoverId: undefined,
    extent: DEFAULT_EXTENT
  }),
  computed: {
    ...mapGetters({
      mapBounds: 'dataAnalysis/mapBounds',
      analysisItems: 'dataAnalysis/analysisItems'
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
      const outputSpecs = this.analysisItems.map(({ id, modelId, model, outputVariable, selection }) => ({ id, modelId, model, outputVariable, ...selection }))
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
    },
    colorOption() {
      const { modelId, outputVariable } = this.selection || {};
      return getModelOutputColorOption(modelId, outputVariable);
    }
  },
  watch: {
    filters() {
      this.updateLayerFilter();
    },
    selection() {
      this.refresh();
    }
  },
  created() {
    this.mapFixedOptions = {
      minZoom: 1,
      ...BASE_MAP_OPTIONS
    };
    this.vectorSourceId = 'maas-vector-source';
    this.vectorSourceLayer = 'maas';
    this.vectorSourceMaxzoom = 8;
    this.idPropName = { [this.vectorSourceLayer]: 'id' }; // name of the feature property to be used for feature id
    this.colorLayerId = 'color-layer';
    this.baseLayerId = 'base-layer';
  },
  mounted() {
    this.refresh();
  },
  methods: {
    ...mapActions({
      setMapBounds: 'dataAnalysis/setMapBounds'
    }),
    refresh() {
      // Intilaize min max boundary value
      this.updateStats().then(() => {
        this.refreshLayers();
        this.updateLayerFilter();
      });
    },
    refreshLayers() {
      this.baseLayer = baseLayer(this.valueProp);
      const { min, max } = this.extent;
      const { color, scaleFn } = this.colorOption;
      this.colorLayer = createHeatmapLayerStyle(this.valueProp, [min, max], getColors(color, 20), scaleFn);
    },
    async updateStats() {
      const { runId, outputVariable, modelId } = this.selection || {};
      if (!runId || !outputVariable || !modelId) {
        this.extent = DEFAULT_EXTENT;
        return;
      }
      // FIXME: This is old api call that accepts bounds and returns stats calculated based on geohash grids. Result won't quite match with current geotiled vector map ouput
      // We need to update the api so we get the stats based on geotile gtrid. Ideally we need to get the stats for all available zoom (precision) levels in single request
      const stats = (await API.get(`/old/maas/output/${runId}/stats`, {
        params: {
          feature: outputVariable,
          model: modelId,
          ...this.formattedMapBounds
        }
      })).data;
      this.extent = {
        ...DEFAULT_EXTENT,
        min: stats.min,
        max: stats.max
      };
      this.$emit(EXTENT_UPDATE_EVENT, this.extent);
    },
    onMapLoad(event) {
      const map = event.map;
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
      // Merge filter for the currnet map and all globally applied filters together
      const filter = this.filters.reduce((prev, cur) => {
        if (cur.id !== this.valueProp && !cur.global) return prev;
        return [...prev, ...createRangeFilter(cur.range, cur.id)];
      }, []);
      this.colorLayer.filter = ['all', ['has', this.valueProp], ...filter];
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
      map.removeFeatureState({ source: this.vectorSourceId, id: this.hoverId, sourceLayer: this.vectorSourceLayer });
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
      const value = _.isNil(feature) ? 0 : feature.properties[this.valueProp];
      return chartValueFormatter([this.extent.min, this.extent.max])(value);
    }
  }
};
</script>
