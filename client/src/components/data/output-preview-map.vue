<template>
  <wm-map
    v-bind="mapFixedOptions"
    :bounds="mapBounds"
    @move="onMapMove"
    @load="onMapLoad"
    @mousemove="onMouseMove"
    @mouseout="onMouseOut"
    @render="onRender"
  >
    <wm-map-vector
      v-if="vectorSource"
      :source-id="vectorSourceId"
      :source="vectorSource"
      :source-layer="vectorSourceLayer"
      :source-maxzoom="vectorSourceMaxzoom"
      :promote-id="'result'"
      :layer-id="colorLayerId"
      :layer="colorLayer"
    />
    <wm-map-popup
      :layer-id="colorLayerId"
      :formatter-fn="popupValueFormatter"
      :cursor="'default'"
    />
  </wm-map>
</template>

<script>

import _ from 'lodash';
import moment from 'moment';
import { mapActions, mapGetters } from 'vuex';
import { DEFAULT_MODEL_OUTPUT_COLOR_OPTION } from '@/utils/model-output-util';
import { WmMap, WmMapVector, WmMapPopup } from '@/wm-map';
import { getColors } from '@/utils/colors-util';
import { BASE_MAP_OPTIONS, createHeatmapLayerStyle, isLayerLoaded } from '@/utils/map-utils';

import { chartValueFormatter } from '@/utils/string-util';
const DEFAULT_EXTENT = { min: 0, max: 1 };
// Name of the value property of the feature to be rendered
const VALUE_PROPERTY_NAME = 'result';

export default {
  name: 'OutputPreviewMap',
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
    }
  },
  data: () => ({
    colorLayer: undefined,
    hoverId: undefined,
    extent: null
  }),
  computed: {
    ...mapGetters({
      mapBounds: 'dataAnalysis/mapBounds',
      analysisItems: 'dataAnalysis/analysisItems',
      algebraicTransform: 'dataAnalysis/algebraicTransform',
      algebraicTransformInputIds: 'dataAnalysis/algebraicTransformInputIds'
    }),
    terms() {
      return this.algebraicTransformInputIds
        .map(inputId => this.analysisItems.find(item => item.id === inputId))
        .map(({ id, modelId, outputVariable, selection }) => ({ id, modelId, outputVariable, ...selection }))
        .filter(({ id, modelId, runId, outputVariable, timestamp }) => {
          return id && modelId && runId && outputVariable && timestamp;
        });
    },
    urlExpression() {
      // Generate a URL encoded, C-like (https://github.com/Knetic/govaluate) expression
      //  to match the current transform
      const expression = this.terms
        .map((term, index) => `[term${index}]`)
        .join(` ${this.algebraicTransform.expressionSymbol} `);
      return encodeURIComponent(expression);
    },
    vectorSource() {
      const outputSpecs = this.terms
        .map((term, index) => {
          return {
            model: term.modelId,
            runId: term.runId,
            feature: term.outputVariable,
            date: moment(term.timestamp).toISOString(),
            valueProp: `term${index}`
          };
        });
      return `${window.location.protocol}/${window.location.host}/api/maas/output/tiles/{z}/{x}/{y}` +
        `?specs=${JSON.stringify(outputSpecs)}` +
        `&expression=${this.urlExpression}`;
    }
  },
  watch: {
    selection() {
      this.refreshLayers();
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
  },
  mounted() {
    this.refreshLayers();
  },
  methods: {
    ...mapActions({
      setMapBounds: 'dataAnalysis/setMapBounds'
    }),
    refreshLayers() {
      const { color, scaleFn } = DEFAULT_MODEL_OUTPUT_COLOR_OPTION;
      const { min, max } = this.extent || DEFAULT_EXTENT;
      this.colorLayer = createHeatmapLayerStyle(VALUE_PROPERTY_NAME, [min, max], getColors(color, 20), scaleFn);
    },
    onMapLoad(event) {
      const map = event.map;
      event.map.showTileBoundaries = false; // set to true for debugging

      // disable tilt and rotation of the map since theses are not working nicely with bound syncing
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
    },
    onMapMove(event) {
      this.syncBounds(event);
      this.throttledReevaluateColourScale(event);
    },
    onRender(event) {
      // The `render` event is called when a map layer is loaded, as well as when
      //  the map moves. We need to reevaluate the colour scale here since the
      //  colour layer won't be loaded in the onMapLoad event, and the user might
      //  not cause the onMapMove event to fire immediately.
      // If extent !== null, that means the colour scale has been initialized, and
      //  we can rely on the onMapMove handler to take care of future updates.
      if (this.extent !== null) return;
      this.throttledReevaluateColourScale(event);
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
    throttledReevaluateColourScale: _.throttle(
      function(event) { this.reevaluateColourScale(event); },
      100,
      { trailing: true, leading: true }
    ),
    reevaluateColourScale(event) {
      // Exit early if the layer hasn't finished loading
      if (!isLayerLoaded(event.map, this.colorLayerId)) return;
      // Loop through rendered features, keeping track of the lowest and highest values
      let min = Infinity;
      let max = -Infinity;
      const dataPoints = event.map.queryRenderedFeatures({ layers: [this.colorLayerId] });
      dataPoints.forEach(point => {
        const value = point.properties.result;
        min = Math.min(min, value);
        max = Math.max(max, value);
      });
      const unchanged = this.extent !== null &&
        min === this.extent.min &&
        this.max === this.extent.max;
      if (unchanged || dataPoints.length === 0) return;
      // Update the extent with the new lowest and highest values
      this.extent = { min, max };
      // Refresh the map now that the colour scale has been updated
      this.refreshLayers();
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

      this._unsetHover(map);

      if (!isLayerLoaded(event.map, this.colorLayerId)) return;
      const features = map.queryRenderedFeatures(mapboxEvent.point, { layers: [this.colorLayerId] });
      features.forEach(feature => {
        this._setLayerHover(map, feature);
      });
    },
    onMouseOut(event) {
      // reset hover feature state when mouse moves out of the map
      this._unsetHover(event.map);
    },
    popupValueFormatter(feature) {
      const value = _.isNil(feature) ? 0 : feature.properties[VALUE_PROPERTY_NAME];
      return chartValueFormatter([this.extent.min, this.extent.max])(value);
    }
  }
};
</script>
