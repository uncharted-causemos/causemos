<template>
  <div class="analysis-map-container">
    <div class="value-filter">
      <map-legend :ramp="legendData" />
    </div>
    <wm-map
      v-bind="mapFixedOptions"
      :bounds="mapBounds"
      @load="onMapLoad"
      @move="onMapMove"
      @mousemove="onMouseMove"
      @mouseout="onMouseOut"
      @styledata="onStyleChange"
    >
      <wm-map-vector
        v-if="vectorSource"
        :key="baseLayerTrigger"
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
        :key="baseLayerTrigger"
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
import { COLOR_SCHEME } from '@/utils/colors-util';
import { BASE_MAP_OPTIONS, createHeatmapLayerStyle, ETHIOPIA_BOUNDING_BOX, isLayerLoaded, createDivergingColorStops, createColorStops } from '@/utils/map-util';
import { chartValueFormatter } from '@/utils/string-util';
import MapLegend from '@/components/widgets/map-legend';
import { mapGetters } from 'vuex';

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

const baseLayer = (property, useFeatureState = false, relativeTo) => {
  const caseRelativeToMissing = [];
  const getter = useFeatureState ? 'feature-state' : 'get';
  relativeTo && caseRelativeToMissing.push(['all', ['==', null, [getter, relativeTo]]], 1);
  if (useFeatureState) {
    return Object.freeze({
      type: 'fill',
      paint: {
        'fill-antialias': true,
        'fill-color': 'grey',
        'fill-opacity': [
          'case',
          ['==', null, ['feature-state', property]], 0.0,
          ...caseRelativeToMissing,
          ['boolean', ['feature-state', 'hover'], false], 0.4, // opacity to 0.4 on hover
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
          ...caseRelativeToMissing,
          ['boolean', ['feature-state', 'hover'], false], 0.4, // opacity to 0.4 on hover
          0.1 // default
        ]
      },
      filter: ['all', ['has', property]]
    });
  }
};

const createMapLegendData = (domain, colors, scaleFn, relativeTo) => {
  const stops = !_.isNil(relativeTo)
    ? createDivergingColorStops(domain, colors, scaleFn)
    : createColorStops(domain, colors, scaleFn);
  const labels = [];
  // process with color stops (e.g [c1, v1, c2, v2, c3]) where cn is color and vn is value.
  const format = (v) => chartValueFormatter(stops[1], stops[stops.length - 3])(v);
  stops.forEach((item, index) => {
    if (index === 1) {
      labels.push(`< ${format(item)}`);
    } else if (index % 2 !== 0) {
      labels.push(`${format(stops[index - 2])} - ${format(item)}`);
    }
    // if last stop value
    if (index === stops.length - 2) {
      labels.push(`> ${format(item)}`);
    }
  });
  const data = [];
  colors.forEach((item, index) => {
    data.push({ color: item, label: labels[index] });
  });
  return data.reverse();
};

export default {
  name: 'AnalysisMapSimple',
  components: {
    WmMap,
    WmMapVector,
    WmMapPopup,
    MapLegend
  },
  emits: [
    'on-map-load',
    'aggregation-level-change',
    'slide-handle-change',
    'sync-bounds'
  ],
  props: {
    // Provide multiple ouput source specs in order to fetch map tiles or data that includes multiple output data (eg. multiple runs, different model ouputs etc.)
    outputSourceSpecs: {
      type: Array,
      default: () => []
    },
    outputSelection: {
      type: String,
      default: null
    },
    relativeTo: {
      type: String,
      default: null
    },
    showTooltip: {
      type: Boolean,
      default: false
    },
    selectedLayerId: {
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
    },
    regionData: {
      type: Object,
      default: () => undefined
    }
  },
  data: () => ({
    baseLayer: undefined,
    baseLayerTrigger: undefined, // This data member is used specifically to trigger data layer re-rendering.
    colorLayer: undefined,
    hoverId: undefined,
    map: undefined,
    gridStats: undefined,
    legendData: []
  }),
  computed: {
    ...mapGetters({
      selectedBaseLayerEndpoint: 'map/selectedBaseLayerEndpoint',
      selectedDataLayer: 'map/selectedDataLayer'
    }),
    mapFixedOptions() {
      const options = {
        minZoom: 1,
        ...BASE_MAP_OPTIONS
      };
      options.style = this.selectedBaseLayerEndpoint;
      options.mapStyle = this.selectedBaseLayerEndpoint;
      return options;
    },
    selection() {
      return this.outputSourceSpecs.find(spec => spec.id === this.outputSelection);
    },
    baselineSpec() {
      return _.isNil(this.relativeTo) || this.relativeTo === this.outputSelection
        ? undefined
        : this.outputSourceSpecs.find(spec => spec.id === this.relativeTo);
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
    isGridMap() {
      return this.vectorSourceLayer === 'maas';
    },
    adminLevel() {
      if (this.selectedLayerId > 3) return undefined;
      return this.selectedLayerId === 0 ? 'country' : 'admin' + this.selectedLayerId;
    },
    stats() {
      const stats = {};
      if (!this.regionData) return stats;
      if (this.baselineSpec) {
        const baselineProp = this.baselineSpec.id;
        for (const [key, data] of Object.entries(this.regionData)) {
          const values = [];
          data.filter(v => v.values[baselineProp] !== undefined).forEach(v => {
            const diffs = Object.values(v.values).map(value => value - v.values[baselineProp]);
            values.push(...diffs);
          });
          if (values.length) {
            stats[key] = { min: Math.min(...values), max: Math.max(...values) };
          }
        }
      } else {
        for (const [key, data] of Object.entries(this.regionData)) {
          const values = data.filter(v => v.values[this.valueProp] !== undefined).map(v => v.values[this.valueProp]);
          if (values.length) {
            stats[key] = { min: Math.min(...values), max: Math.max(...values) };
          }
        }
      }
      return stats;
    },
    extent() {
      const extent = this.stats[this.adminLevel] || this.gridStats;
      if (!extent) return { min: 0, max: 1 };
      if (extent.min === extent.max) {
        extent[Math.sign(extent.min) === -1 ? 'max' : 'min'] = 0;
      }
      return extent;
    },
    valueProp() {
      // Name of the value property of the feature to be rendered
      return (this.selection && this.selection.id) || '';
    },
    vectorSource() {
      if (this.isGridMap) {
        const outputSpecs = this.outputSourceSpecs
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
      } else {
        return `${window.location.protocol}/${window.location.host}/api/maas/tiles/cm-${this.selectedLayer.vectorSourceLayer}/{z}/{x}/{y}`;
      }
    },
    colorOption() {
      return DEFAULT_MODEL_OUTPUT_COLOR_OPTION;
    },
    colorScheme() {
      if (!_.isNil(this.relativeTo)) {
        return this.relativeTo === this.outputSelection ? COLOR_SCHEME.GREYS_7 : COLOR_SCHEME.PIYG_7;
      }
      return COLOR_SCHEME.PURPLES_7;
    },
    filter() {
      return this.filters.find(filter => filter.id === this.valueProp);
    },
    isFilterGlobal() {
      return this.filter && this.filter.global;
    }
  },
  watch: {
    filters() {
      this.updateLayerFilter();
    },
    selection() {
      this.refresh();
    },
    relativeTo() {
      this.refresh();
    },
    regionData() {
      this.refresh();
    },
    selectedLayer() {
      this.refreshLayers();
    }
  },
  created() {
    this.vectorSourceId = 'maas-vector-source';
    this.vectorSourceMaxzoom = 8;
    this.colorLayerId = 'color-layer';
    this.baseLayerId = 'base-layer';
    // Init layer objects
    this.refreshLayers();
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      if (!this.map || !this.selection) return;

      this.setFeatureStates();
      this.refreshLayers();
      this.updateLayerFilter();
    },
    refreshLayers() {
      if (this.extent === undefined || this.colorOption === undefined) return;
      const useFeatureState = !this.isGridMap;
      this.baseLayer = baseLayer(this.valueProp, useFeatureState, this.baselineSpec?.id);
      this.refreshColorLayer(useFeatureState);
    },
    refreshColorLayer(useFeatureState = false) {
      const { min, max } = this.extent;
      const { scaleFn } = this.colorOption;
      const relativeToProp = this.baselineSpec?.id;
      this.colorLayer = createHeatmapLayerStyle(this.valueProp, [min, max], { min, max }, this.colorScheme, scaleFn, useFeatureState, relativeToProp);
      this.legendData = createMapLegendData([min, max], this.colorScheme, scaleFn, relativeToProp);
    },
    setFeatureStates() {
      if (!this.adminLevel) return;

      // Remove all states of the source. This doens't seem to remove the keys of target feature id already loaded in memory.
      this.map.removeFeatureState({
        source: this.vectorSourceId,
        sourceLayer: this.vectorSourceLayer
      });
      // Note: RemoveFeatureState doesn't seem very reliable.
      // For example, for prvious state, { id: 'Ethiopia', state: {a: 1, b:2, c:3 } }, removeFeatureState seems to remove the state and make it undefined
      // But once new state, lets's say {b: 4} is set by setFetureState afterwards, it just extends previous state instead of setting it to new state resulting something like
      // { id: 'Ethiopia', state: {a: 1, b:4, c:3 } where we don't want 'a' and 'c'
      // To work around above issue, explitly set undefined to each output value by default since removeFeatureState doesn't seem very reliable.
      const featureStateBase = {};
      this.outputSourceSpecs.forEach(spec => { featureStateBase[spec.id] = undefined; });

      this.regionData[this.adminLevel].forEach(row => {
        this.map.setFeatureState({
          id: row.id,
          source: this.vectorSourceId,
          sourceLayer: this.vectorSourceLayer
        }, {
          ...featureStateBase,
          ...row.values
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
    updateLayerFilter() {
      if (!this.colorLayer) return;
      // Merge filter for the current map and all globally applied filters together
      if (this.isGridMap) {
        const filter = this.filters.reduce((prev, cur) => {
          if (cur.id !== this.valueProp && !cur.global) return prev;
          return [...prev, ...createRangeFilter(cur.range, cur.id)];
        }, []);
        const relativeToProp = this.baselineSpec && this.baselineSpec.id;
        if (relativeToProp) filter.unshift(['has', relativeToProp]);
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
    onStyleChange() {
      // This line of code must be executed after map style is changed so that the data layer shows up.
      // The data layer only shows up if wm-map-vector is re-rendered using :key after the style change.
      this.baseLayerTrigger = this.selectedBaseLayerEndpoint;
    },
    popupValueFormatter(feature) {
      const prop = this.isGridMap ? feature?.properties : feature?.state;
      if (_.isNil(prop && prop[this.valueProp])) return null;

      const value = prop[this.valueProp];
      const format = v => chartValueFormatter(this.extent.min, this.extent.max)(v);
      const rows = [format(value)];
      if (this.baselineSpec) {
        const diff = prop[this.valueProp] - prop[this.baselineSpec.id];
        const text = _.isNaN(diff) ? 'Diff: Baseline has no data for this area' : 'Diff: ' + format(diff);
        rows.push(text);
      }
      if (!this.isGridMap) rows.push('Region: ' + feature.id.replaceAll('__', '/'));
      return rows.filter(field => !_.isNil(field)).join('<br />');
    },
    throttledReevaluateColourScale: _.throttle(
      function() { this.reevaluateColourScale(); },
      100,
      { trailing: true, leading: true }
    ),
    // Dynamically calculate min max stats for grid map
    // TODO: Use precomputed stats for each zoom level (espcially for 'sum') when backend api is ready since this is performance intensive
    reevaluateColourScale() {
      if (!this.map) return;
      // Exit early if the layer hasn't finished loading
      if (!isLayerLoaded(this.map, this.baseLayerId)) return;
      // This only applies to grid map
      if (!this.isGridMap) return;
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
      this.refreshColorLayer();
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
}
</style>
