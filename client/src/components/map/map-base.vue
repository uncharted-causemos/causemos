<template>
  <div
    ref="map-base"
    class="map-panel"
  >
    <slot v-if="ready" />
  </div>
</template>

<script>
import L from 'leaflet';
import _ from 'lodash';

const MIN_ZOOM = 2;
const MAX_ZOOM = 18;

export default {
  name: 'MapBase',
  props: {
    center: {
      type: Array,
      default: () => [0, 0]
    },
    zoom: {
      type: Number,
      default: 4
    },
    minZoom: {
      type: Number,
      default: MIN_ZOOM
    },
    maxZoom: {
      type: Number,
      default: MAX_ZOOM
    },
    /** bounds in form of  [[lat, lng], [lat, lng]] */
    bounds: {
      type: Array,
      default: null
    }
  },
  data: () => ({
    ready: false
  }),
  watch: {
    center: function baseDataChanged(n, o) {
      if (_.isEqual(n, o)) return;
      this.setView();
    },
    zoom: function () {
      this.setView();
    },
    minZoom: function (val) {
      this.mapObject.setMinZoom(val);
    },
    maxZoom: function (val) {
      this.mapObject.setMaxZoom(val);
    },
    bounds: function (n, o) {
      if (_.isEqual(n, o)) return;
      this.setBounds(n);
    }
  },
  mounted() {
    this.createMap();
    this.enableEvents();
    this.setBounds(this.bounds);
  },
  destroyed() {
    // Although this .remove() clears all child layers and events handlers,
    // by the time this hook is called, all child map components should already be cleaned up in its own destroyed hook
    this.mapObject.remove();
  },
  methods: {
    createMap() {
      this.mapObject = L.map(this.$refs['map-base'], {
        preferCanvas: true,
        center: this.center,
        zoom: this.zoom,
        minZoom: this.minZoom,
        maxZoom: this.maxZoom
      });
      // Add tile layer
      this.tileLayer = L.tileLayer(
        '/api/map/tiles?s={s}&z={z}&x={x}&y={y}',
        {
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>'
        }
      );
      this.tileLayer.addTo(this.mapObject);
      this.ready = true;
    },
    setView() {
      this.mapObject.setView(this.center, this.zoom);
    },
    setBounds(bounds) {
      if (!bounds) return;
      const newBounds = L.latLngBounds(bounds);
      if (!newBounds.isValid()) {
        return;
      }
      this.mapObject.fitBounds(newBounds);
    },
    enableEvents() {
      this.mapObject.on('click', this.onClick);
    },
    disableEvents() {
      this.mapObject.off('click', this.onClick);
    },
    onClick(evt) {
      this.$emit('click', evt);
    }
  }
};
</script>

<style lang="scss" scoped>
.map-panel {
  height: 100%;
}
</style>
