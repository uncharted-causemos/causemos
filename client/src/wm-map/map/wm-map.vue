<template>
  <div
    ref="wmmap"
    class="wm-map"
  >
    <slot v-if="ready" />
    <resize-observer @notify="handleResize" />
  </div>
</template>

<script>
import _, { isEqual } from 'lodash';
import mapboxgl from 'mapbox-gl';
import options from './options';
import { eventEmitter } from '../mixins';

import 'mapbox-gl/dist/mapbox-gl.css';

// Ref: https://docs.mapbox.com/mapbox-gl-js/api/#map.event:resize
const MAPBOX_EVENTS = [
  'load',
  'click',
  'move',
  'moveend',
  'mousemove',
  'mouseout',
  'render',
  'sourcedata',
  'styledata',
  'resize'
  // More events can be added in the future
];

const RESIZE_DELAY = 50;

const getFitBoundsParams = (bounds) => {
  const params = (bounds?.value && bounds?.options)
    ? [bounds.value, bounds.options]
    : [bounds, { duration: 0 }];
  return params;
};

export default {
  name: 'WmMap',
  mixins: [eventEmitter],
  props: { ...options },
  emits: [
    ...MAPBOX_EVENTS
  ],
  data: () => ({
    ready: false,
    handleResize: () => null
  }),
  watch: {
    center(value, oldValue) {
      if (isEqual(value, oldValue)) return;
      this._jumpTo({ center: value });
    },
    zoom(value) {
      this._jumpTo({ zoom: value });
    },
    pitch(value) {
      this._jumpTo({ pitch: value });
    },
    bearing(value) {
      this._jumpTo({ bearing: value });
    },
    minZoom(value) {
      this.map.setMinZoom(value);
    },
    maxZoom(value) {
      this.map.setMaxZoom(value);
    },
    bounds(value) {
      if (!this.cameraMoveEnabled || !this.map) return;
      const params = getFitBoundsParams(value);
      this.map.fitBounds(...params);
    },
    mapStyle(value) {
      this.map.setStyle(value);
    }
  },
  created() {
    this.map = null;
    this.cameraMoveEnabled = true;
  },
  mounted() {
    this._loadMap();
  },
  unmounted() {
    if (this.map) this.map.remove();
  },
  methods: {
    _jumpTo(cameraOptions) {
      if (!this.cameraMoveEnabled) return;
      this.map.jumpTo(cameraOptions);
    },
    _loadMap() {
      // rename mapStyle to style
      const { mapStyle: style, ...options } = this.$props;
      // Re-assign bounds value to options.bounds
      // getFitBoundsParams return `[bounds, options]` and we want to assign only `bounds` to options.bounds here.
      options.bounds = getFitBoundsParams(options.bounds)[0];
      this.map = new mapboxgl.Map({
        container: this.$refs.wmmap,
        style,
        ...options
      });
      this.bindMapEvents();
      this.map.on('load', () => {
        this.ready = true;
        // HACK: map will only take up part of its parent container leaving a section of white
        //  space if its container is resized during load (e.g. when the drilldown panel is
        //  closed when switching from the 'Graph' tab in the KB-Explorer). This fix technically
        //  relies on a race condition, that the layout will be settled by the time the map loads.
        this.map.resize();
        // It appears that bound set by `new mapboxgl.Map({ bounds })` and this.map.fitBounds (which is also called in bounds watcher)
        // behave differently. So make sure  `fitBounds` is called for the consistency
        if (!this.bounds) return;
        this.map.fitBounds(...getFitBoundsParams(this.bounds));
      });
      this.handleResize = _.debounce(() => {
        this.map.resize();
      }, RESIZE_DELAY);
    },
    enableCamera() {
      this.cameraMoveEnabled = true;
    },
    disableCamera() {
      this.cameraMoveEnabled = false;
    },
    bindMapEvents() {
      MAPBOX_EVENTS.forEach(eventName => {
        this.map.on(eventName, this.$_emitMapEvent);
      });
    },
    unbindEvents() {
      MAPBOX_EVENTS.forEach(eventName => {
        this.map.off(eventName, this.$_emitMapEvent);
      });
    }
  }
};
</script>

<style lang="scss" scoped>

.wm-map {
  height: 100%;
  position: relative;
  overflow: hidden;
  :deep(.mapboxgl-popup-content) {
    background: black;
    border-color: black;
    color: #FFFFFF;
  }
  :deep(.mapboxgl-popup-tip) {
    border-top-color: black;
  }
}
</style>
