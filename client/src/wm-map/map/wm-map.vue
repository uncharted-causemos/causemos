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
  'render'
  // More events can be added in the future
];

const RESIZE_DELAY = 50;

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
      if (!this.cameraMoveEnabled) return;
      // duration 0 to diable animation
      this.map.fitBounds(value, { duration: 0 });
    }
  },
  created() {
    this.map = null;
    this.cameraMoveEnabled = true;
  },
  mounted() {
    this._loadMap();
  },
  umounted() {
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
      this.map = new mapboxgl.Map({
        container: this.$refs.wmmap,
        style,
        ...options
      });
      this.bindMapEvents(MAPBOX_EVENTS);
      this.map.on('load', () => {
        this.ready = true;
        // HACK: map will only take up part of its parent container leaving a section of white
        //  space if its container is resized during load (e.g. when the drilldown panel is
        //  closed when switching from the 'Graph' tab in the KB-Explorer). This fix technically
        //  relies on a race condition, that the layout will be settled by the time the map loads.
        this.map.resize();
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
    bindMapEvents(events) {
      // Bind and forwards map events
      Object.keys(this.$attrs).forEach(eventName => {
        // FIXME: Vue3 https://v3.vuejs.org/guide/migration/listeners-removed.html
        if (eventName.startsWith('on')) {
          const cleanEventName = eventName.substring(2).toLowerCase();
          if (events.includes(cleanEventName)) {
            this.map.on(cleanEventName, this.$_emitMapEvent);
          }
        }
      });
    },
    unbindEvents() {
      Object.keys(this.$attrs).forEach(eventName => {
        // FIXME: Vue3 https://v3.vuejs.org/guide/migration/listeners-removed.html
        if (eventName.startsWith('on')) {
          const cleanEventName = eventName.substring(2).toLowerCase();
          this.map.off(cleanEventName, this.$_emitMapEvent);
        }
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/custom";

.wm-map {
  height: 100%;
  position: relative;
  overflow: hidden;
  /deep/ .mapboxgl-popup-content {
    background: $color-background-lvl-4;
    border-color: $color-background-lvl-4;
    color: #FFFFFF;
  }
  /deep/ .mapboxgl-popup-tip {
    border-top-color: $color-background-lvl-4;
  }
}
</style>
