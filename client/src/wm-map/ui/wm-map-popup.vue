<template>
  <div />
</template>

<script>

import mapboxgl from 'mapbox-gl';
import { eventEmitter } from '../mixins';

export default {
  name: 'WmMapPopup',
  mixins: [eventEmitter],
  props: {
    /**
     * Layer Id
     */
    layerId: {
      type: String,
      required: true
    },
    formatterFn: {
      type: Function,
      required: true
    },
    cursor: {
      type: String,
      default: 'crosshair'
    }
  },
  data: () => ({
    popup: null
  }),
  mounted() {
    this.mapComponent = this.$parent;
    if (!this.mapComponent.map) {
      return console.error('Parent element is not a map object');
    }
    this.map = this.mapComponent.map;
    this.popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
    });
    this.map.on('mousemove', this.layerId, this.onMouseMove);
    this.map.on('mouseleave', this.layerId, this.onMouseLeave);
  },
  unmounted() {
    this.finish();
  },
  methods: {
    onMouseMove(event) {
      this.map.getCanvas().style.cursor = this.cursor;
      this.popup
        .setLngLat(event.lngLat)
        .setHTML(this.formatterFn(event.features[0]))
        .addTo(this.map);
    },
    onMouseLeave() {
      // reset cursor
      this.map.getCanvas().style.cursor = '';
      // remove popup
      this.popup.remove();
    },
    finish() {
      this.map.off('mousemove', this.layerId, this.onMouseMove);
      this.map.off('mouseleave', this.layerId, this.onMouseLeave);
      this.popup.remove();
    }
  }
};
</script>
