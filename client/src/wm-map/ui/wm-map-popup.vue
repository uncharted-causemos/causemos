<template>
  <div />
</template>

<script>
import mapboxgl from 'maplibre-gl';
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
      required: true,
    },
    formatterFn: {
      type: Function,
      required: true,
    },
    cursor: {
      type: String,
      default: 'crosshair',
    },
  },
  data: () => ({
    popup: null,
  }),
  watch: {
    layerId(val, oldVal) {
      this.removeEvents(oldVal);
      this.addEvents(val);
    },
  },
  mounted() {
    this.mapComponent = this.$parent;
    if (!this.mapComponent.map) {
      return console.error('Parent element is not a map object');
    }
    this.map = this.mapComponent.map;
    this.popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });
    this.addEvents(this.layerId);
  },
  unmounted() {
    this.finish();
  },
  methods: {
    onMouseMove(event) {
      const formattedValue = this.formatterFn(event.features[0]);
      if (formattedValue === null) {
        this.map.getCanvas().style.cursor = '';
        this.popup.remove();
      } else {
        this.map.getCanvas().style.cursor = this.cursor;
        this.popup.setLngLat(event.lngLat).setHTML(formattedValue).addTo(this.map);
      }
    },
    onMouseLeave() {
      // reset cursor
      this.map.getCanvas().style.cursor = '';
      // remove popup
      this.popup.remove();
    },
    removeEvents(layerId) {
      this.map.off('mousemove', layerId, this.onMouseMove);
      this.map.off('mouseleave', layerId, this.onMouseLeave);
    },
    addEvents(layerId) {
      this.map.on('mousemove', layerId, this.onMouseMove);
      this.map.on('mouseleave', layerId, this.onMouseLeave);
    },
    finish() {
      this.removeEvents(this.layerId);
      this.popup.remove();
    },
  },
};
</script>
