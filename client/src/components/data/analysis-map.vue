<template>
  <div class="analysis-map-container">
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
        :key="layerRerenderTrigger"
        :source="vectorSource"
        :source-id="vectorSourceId"
        :source-layer="sourceLayer"
        :source-maxzoom="vectorSourceMaxzoom"
        :promote-id="idPropName"
        :layer-id="baseLayerId"
        :layer="baseLayer"
        :before-id="firstSymbolLayerId"
      />
      <wm-map-vector
        v-if="vectorSource && vectorColorLayer"
        :key="layerRerenderTrigger"
        :source-id="vectorSourceId"
        :source-layer="sourceLayer"
        :promote-id="idPropName"
        :layer-id="colorLayerId"
        :layer="vectorColorLayer"
        :before-id="firstSymbolLayerId"
        @add-layer="onAddLayer"
        @update-source="onUpdateSource"
      />
      <wm-map-geojson
        v-if="isPointsMap && pointsColorLayer"
        :source-id="pointsSource"
        :source="rawGeoJson"
        :layer-id="pointsLayerId"
        :layer="pointsColorLayer"
      />
      <template v-if="showPreRenderedViz">
        <wm-map-image
          v-for="pregen in preRenderedData" :key="pregen.file"
          :source="pregen.file"
          :source-id="imageSourceId"
          :layer-id="imageLayerId"
          :coords="pregen.coords"
        />
      </template>
      <wm-map-popup
        v-if="showTooltip"
        :layer-id="isPointsMap ? pointsLayerId : baseLayerId"
        :formatter-fn="popupValueFormatter"
        :cursor="'default'"
      />
    </wm-map>
  </div>
</template>

<script>

import _ from 'lodash';
import * as d3 from 'd3';
import {
  defineComponent,
  toRefs
} from 'vue';
import { WmMap, WmMapVector, WmMapImage, WmMapPopup, WmMapGeojson } from '@/wm-map';
import useMapRegionSelection from '@/services/composables/useMapRegionSelection';
import useMapSyncBounds from '@/services/composables/useMapSyncBounds';
import { COLOR_SCHEME } from '@/utils/colors-util';
import {
  BASE_MAP_OPTIONS,
  createHeatmapLayerStyle,
  createPointsLayerStyle,
  ETHIOPIA_BOUNDING_BOX,
  STYLE_URL_PREFIX
} from '@/utils/map-util';
import {
  convertRawDataToGeoJson,
  pickQualifiers
} from '@/utils/outputdata-util';
import { BASE_LAYER, SOURCE_LAYERS, SOURCE_LAYER } from '@/utils/map-util-new';
import { calculateDiff } from '@/utils/value-util';
import { REGION_ID_DELIMETER, adminLevelToString } from '@/utils/admin-level-util';
import { capitalize, exponentFormatter } from '@/utils/string-util';
import { mapActions, mapGetters } from 'vuex';

const createRangeFilter = ({ min, max }, prop) => {
  const lowerBound = ['>=', prop, Number(min)];
  const upperBound = ['<=', prop, Number(max)];
  return [lowerBound, upperBound];
};

const baseLayer = (property, useFeatureState = false, relativeTo) => {
  const caseRelativeToMissing = [];
  const getter = useFeatureState ? 'feature-state' : 'get';
  relativeTo && caseRelativeToMissing.push(['all', ['==', null, [getter, relativeTo]], ['==', null, [getter, '_baseline']]], 1);
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
      filter: ['all', ['has', property], ['!=', 'NaN', ['to-string', ['get', property]]]]
    });
  }
};

export default defineComponent({
  name: 'AnalysisMap',
  components: {
    WmMap,
    WmMapVector,
    WmMapImage,
    WmMapPopup,
    WmMapGeojson
  },
  emits: [
    'on-map-load',
    'aggregation-level-change',
    'slide-handle-change',
    'sync-bounds',
    'zoom-change',
    'map-update'
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
    showPreRenderedViz: {
      type: Boolean,
      default: true
    },
    selectedLayerId: {
      type: String,
      default: SOURCE_LAYERS[0].layerId
    },
    filters: {
      type: Array,
      default: () => []
    },
    mapBounds: {
      type: [Array, Object],
      default: () => [ // Default bounds to Ethiopia
        [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
        [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
      ]
    },
    regionData: {
      type: Object,
      default: () => undefined
    },
    rawData: {
      type: Object,
      default: () => ([])
    },
    selectedRegions: {
      type: Object,
      default: () => ({ country: new Set(), admin1: new Set(), admin2: new Set(), admin3: new Set() })
    },
    adminLayerStats: {
      type: Object,
      default: () => undefined
    },
    gridLayerStats: {
      type: Object,
      default: () => undefined
    },
    pointsLayerStats: {
      type: Object,
      default: () => undefined
    },
    selectedBaseLayer: {
      type: String,
      required: true
    },
    unit: {
      type: String,
      default: null
    },
    showPercentChange: {
      type: Boolean,
      default: false
    },
    colorOptions: {
      type: Object,
      default: () => ({
        scheme: COLOR_SCHEME.DEFAULT,
        scaleFn: d3.scaleLinear,
        isContinuous: false,
        opacity: 1
      })
    }
  },
  setup(props, { emit }) {
    const {
      selectedLayerId,
      selectedRegions
    } = toRefs(props);

    const {
      isRegionSelectionEmpty,
      isRegionSelected
    } = useMapRegionSelection(selectedLayerId, selectedRegions);
    const {
      syncBounds
    } = useMapSyncBounds(emit);

    return {
      isRegionSelectionEmpty,
      isRegionSelected,
      syncBounds
    };
  },
  data: () => ({
    baseLayer: undefined,
    layerRerenderTrigger: undefined, // This is used specifically to trigger data layer re-rendering.
    vectorColorLayer: undefined,
    pointsColorLayer: undefined,
    hoverId: undefined,
    map: undefined,
    curZoom: 0,
    extent: undefined
  }),
  computed: {
    ...mapGetters({
      tour: 'tour/tour'
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
    selectedLayerIndex() {
      return SOURCE_LAYERS.findIndex(l => l.layerId === this.selectedLayerId);
    },
    selectedLayer() {
      return SOURCE_LAYERS[this.selectedLayerIndex];
    },
    sourceLayer() {
      return this.selectedLayer.layerId;
    },
    idPropName() {
      return { [`${this.selectedLayer.layerId}`]: 'id' };
    },
    isAdminMap() {
      return [SOURCE_LAYER.COUNTRY, SOURCE_LAYER.ADMIN1, SOURCE_LAYER.ADMIN2, SOURCE_LAYER.ADMIN3].includes(this.sourceLayer);
    },
    isGridMap() {
      return this.sourceLayer === SOURCE_LAYER.GRID;
    },
    isPointsMap() {
      return this.sourceLayer === SOURCE_LAYER.POINTS;
    },
    selectedAdminLevel() {
      return adminLevelToString(this.selectedLayerIndex);
    },
    selectedBaseLayerEndpoint() {
      return `${STYLE_URL_PREFIX}${this.selectedBaseLayer}`;
    },
    valueProp() {
      // Name of the value property of the feature to be rendered
      if (this.isPointsMap) return 'value';
      return (this.selection && this.selection.id) || '';
    },
    vectorSource() {
      if (this.isPointsMap) return;
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
        return `${window.location.protocol}/${window.location.host}/${this.selectedLayer.sourceBaseUrl}?specs=${encodeURI(JSON.stringify(outputSpecs))}`;
      } else {
        return `${window.location.protocol}/${window.location.host}/${this.selectedLayer.sourceBaseUrl}`;
      }
    },
    heatMapColorOptions() {
      const options = { ...this.colorOptions };
      if (!_.isNil(this.relativeTo)) {
        options.scheme = this.relativeTo === this.outputSelection ? this.colorOptions.relativeToSchemes[0] : this.colorOptions.relativeToSchemes[1];
      }
      return options;
    },
    filter() {
      return this.filters.find(filter => filter.id === this.valueProp);
    },
    isFilterGlobal() {
      return this.filter && this.filter.global;
    },
    preRenderedData() {
      // map supported overlays (received as pre-generated output) must have valid geo-coords
      return this.selection?.preGeneratedOutput ? this.selection.preGeneratedOutput.filter(p => p.coords !== undefined) : [];
    },
    firstSymbolLayerId() {
      return this.selectedBaseLayer === BASE_LAYER.DEFAULT
        ? 'watername_ocean'
        : undefined;
    },
    rawGeoJson() {
      const data = convertRawDataToGeoJson(this.rawData);
      return data;
    }
  },
  watch: {
    filters() {
      this.updateLayerFilter();
    },
    relativeTo() {
      this.triggerMapUpdateEvent();
      this.debouncedRefresh();
    },
    regionData() {
      this.debouncedRefresh();
    },
    rawData() {
      this.debouncedRefresh();
    },
    selectedLayer() {
      this.debouncedRefresh();
    },
    adminLayerStats() {
      this.debouncedRefresh();
    },
    gridLayerStats() {
      this.debouncedRefresh();
    },
    pointsLayerStats() {
      this.debouncedRefresh();
    },
    selectedRegions() {
      this.debouncedRefresh();
    },
    showPercentChange() {
      this.debouncedRefresh();
    }
  },
  created() {
    this.vectorSourceId = 'maas-vector-source';
    this.vectorSourceMaxzoom = 8;
    this.colorLayerId = 'color-layer';
    this.baseLayerId = 'base-layer';

    this.pointsSource = 'points-data-source';
    this.pointsLayerId = 'points-layer';

    // the following are needed to render pre-generated overlay
    this.imageSourceId = 'maas-image-source';
    this.imageLayerId = 'image-layer';

    this.debouncedRefresh = _.debounce(function() {
      this.refresh();
    }, 50);

    // Init layer objects
    this.refreshLayers();
  },
  mounted() {
    this.refresh();
    //
    // @REVIEW
    // the map component is visible as well as the spatial-aggregation dropdown config
    // allow the relevant tour to advance to the next step
    if (this.tour && this.tour.id.startsWith('aggregations-tour')) {
      this.enableNextStep();
    }
  },
  methods: {
    ...mapActions({
      enableNextStep: 'tour/enableNextStep'
    }),
    refresh() {
      if (!this.map || !this.selection) return;
      this.setFeatureStates();
      this.refreshLayers();
      this.updateLayerFilter();
    },
    triggerMapUpdateEvent() {
      this.$emit('map-update', {
        outputSpecId: this.outputSelection,
        map: this.map,
        component: this
      });
    },
    getExtent() {
      if (this.isGridMap) {
        return this.getGridMapExtent();
      } else if (this.isAdminMap) {
        return this.getAdminMapExtent();
      } else if (this.isPointsMap) {
        return this.getPointsMapExtent();
      }
    },
    getGridMapExtent() {
      if (!this.gridLayerStats) return;
      if (this.baselineSpec) {
        return this.gridLayerStats?.difference?.diff;
      } else if (this.outputSelection === this.relativeTo) {
        const zoomLevels = Object.keys(this.gridLayerStats.baseline).map(Number);
        const maxZoom = Math.max(...zoomLevels);
        const zoom = Math.min(maxZoom, this.curZoom);
        return this.gridLayerStats?.baseline[String(zoom)];
      } else {
        const zoomLevels = Object.keys(this.gridLayerStats.global).map(Number);
        const maxZoom = Math.max(...zoomLevels);
        const zoom = Math.min(maxZoom, this.curZoom);
        return this.gridLayerStats?.global[String(zoom)];
      }
    },
    getAdminMapExtent() {
      if (_.isEmpty(this.adminLayerStats)) return;
      const level = this.selectedAdminLevel;
      if (this.baselineSpec) {
        return this.adminLayerStats?.difference[level];
      } else if (this.outputSelection === this.relativeTo) {
        return this.adminLayerStats?.baseline[level];
      } else {
        return this.adminLayerStats?.global[level];
      }
    },
    getPointsMapExtent() {
      return this.pointsLayerStats?.global.all;
    },
    refreshLayers() {
      const useFeatureState = this.isAdminMap;
      this.baseLayer = baseLayer(this.valueProp, useFeatureState, this.baselineSpec?.id);
      this.refreshColorLayer(useFeatureState);
    },
    refreshColorLayer(useFeatureState = false) {
      this.extent = this.getExtent();
      if (!this.extent) {
        this.vectorColorLayer = undefined;
        return;
      }
      const { min, max } = this.extent;
      const relativeToProp = this.baselineSpec?.id;
      if (this.isPointsMap) {
        this.pointsColorLayer = createPointsLayerStyle(this.valueProp, [min, max], this.colorOptions);
      } else {
        this.vectorColorLayer = createHeatmapLayerStyle(this.valueProp, [min, max], { min, max }, this.heatMapColorOptions, useFeatureState, relativeToProp, this.showPercentChange);
      }
    },
    setFeatureStates() {
      if (!this.map || !this.isAdminMap) return;

      try {
        // Remove all states of the source. This doens't seem to remove the keys of target feature id already loaded in memory.
        this.map.removeFeatureState({
          source: this.vectorSourceId,
          sourceLayer: this.sourceLayer
        });
      } catch {
        // remove feature state throws error when source isn't loaded yet. Then exit.
        return;
      }
      // Note: RemoveFeatureState doesn't seem very reliable.
      // For example, for prvious state, { id: 'Ethiopia', state: {a: 1, b:2, c:3 } }, removeFeatureState seems to remove the state and make it undefined
      // But once new state, lets's say {b: 4} is set by setFetureState afterwards, it just extends previous state instead of setting it to new state resulting something like
      // { id: 'Ethiopia', state: {a: 1, b:4, c:3 } where we don't want 'a' and 'c'
      // To work around above issue, explitly set undefined to each output value by default since removeFeatureState doesn't seem very reliable.
      const featureStateBase = { _baseline: undefined };
      this.outputSourceSpecs.forEach(spec => { featureStateBase[spec.id] = undefined; });

      this.regionData[this.selectedAdminLevel].forEach(row => {
        this.map.setFeatureState({
          id: row.id,
          source: this.vectorSourceId,
          sourceLayer: this.sourceLayer
        }, {
          ...featureStateBase,
          ...row.values,
          _isHidden: this.isRegionSelectionEmpty ? false : !this.isRegionSelected(row.id)
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
        if (this.isGridMap) this.refresh();
      }, 500);
    },
    updateCurrentZoomLevel() {
      if (!this.map) return;
      const zoom = Math.floor(this.map.getZoom());
      if (this.curZoom !== zoom) {
        this.curZoom = zoom;
        this.$emit('zoom-change', {
          outputSpecId: this.outputSelection,
          map: this.map,
          component: this,
          zoom: this.curZoom
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
      this.updateCurrentZoomLevel();

      // Init layers
      this.refreshLayers();

      this.$emit('on-map-load');

      // force map sync after being loaded since a resize event (called during map load)
      //  may have caused the bounds to be out of sync
      this.$emit('sync-bounds', map.getBounds().toArray());
    },
    onMapMove(event) {
      this.updateCurrentZoomLevel();
      this.isGridMap && this.debouncedRefresh();
      this.syncBounds(event);
      this.triggerMapUpdateEvent();
    },
    updateLayerFilter() {
      if (!this.vectorColorLayer) return;
      // Merge filter for the current map and all globally applied filters together
      if (this.isGridMap) {
        const filter = this.filters.reduce((prev, cur) => {
          if (cur.id !== this.valueProp && !cur.global) return prev;
          return [...prev, ...createRangeFilter(cur.range, cur.id)];
        }, []);
        const relativeToProp = this.baselineSpec && this.baselineSpec.id;
        if (relativeToProp) filter.unshift(['has', relativeToProp]);
        const hasProperty = ['has', this.valueProp];
        const notNaN = ['!=', 'NaN', ['to-string', ['get', this.valueProp]]];
        this.vectorColorLayer.filter = ['all', hasProperty, notNaN, ...filter];
      } else {
        this.refreshLayers();
      }
    },
    _setLayerHover(map, feature) {
      // unset previous state and hoveredId can be 0
      map.setFeatureState(
        { source: feature.source, id: feature.id, sourceLayer: this.sourceLayer },
        { hover: true }
      );
      this.hoverId = feature.id;
    },
    _unsetHover(map) {
      if (!this.hoverId) return;
      map.removeFeatureState({ source: this.vectorSourceId, id: this.hoverId, sourceLayer: this.sourceLayer }, 'hover');
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
      // HACK: This line of code must be executed after map style is changed so that the data layer shows up.
      // The data layer only shows up if wm-map-vector is re-rendered using :key after the style change.
      // Also force rerender when selected data layer cahnges (grid <-> admin)
      setTimeout(() => {
        this.layerRerenderTrigger = this.selectedBaseLayerEndpoint + this.isGridMap;
      }, 200);
    },
    numberFormatter(v) {
      // Since there is more room in the tooltip, try to use less scientific notation
      if (v === 0 || (Math.abs(v) >= 1 && Math.abs(v) < 9_999_999)) return d3.format(',.2~f')(v);
      return exponentFormatter(v);
    },
    popupValueFormatter(feature) {
      const prop = this.isAdminMap ? feature?.state : feature?.properties;
      if (_.isNil(prop && prop[this.valueProp])) return null;
      const format = v => this.numberFormatter(v);
      const value = prop[this.valueProp];
      const rows = [`${format(value)} ${_.isNull(this.unit) ? '' : this.unit}`];
      if (this.baselineSpec) {
        const baselineValue = _.isFinite(prop[this.baselineSpec.id]) ? prop[this.baselineSpec.id] : prop._baseline;
        const diff = calculateDiff(baselineValue, prop[this.valueProp], this.showPercentChange);
        const diffString = `${Math.sign(diff) === -1 ? '' : '+'}${format(diff)}${this.showPercentChange ? '%' : ' ' + this.unit}`;
        const text = _.isNaN(diff) ? 'Diff: Baseline has no data or is zero for this area' : 'Diff: ' + diffString;
        rows.push(text);
      }
      if (this.isAdminMap) rows.push('Region: ' + feature.id.replaceAll(REGION_ID_DELIMETER, '/'));
      if (this.isPointsMap) {
        rows.push('Region: ' + [prop.country, prop.admin1, prop.admin2, prop.admin3].filter(v => !!v).join('/'));
        // Add qualifiers
        Object.entries(pickQualifiers(prop))
          .forEach(([key, val]) => {
            rows.push(`${capitalize(key)}: ${val}`);
          });
      }
      return rows.filter(field => !_.isNil(field)).join('<br />');
    }
  }
});
</script>

<style lang="scss" scoped>
.analysis-map-container {
  position: relative;
}
</style>
