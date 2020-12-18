<template>
  <div />
</template>

<script>
import _ from 'lodash';
import { geoJSON } from 'leaflet';

export default {
  name: 'MapGeojson',
  props: {
    // geojson object/array
    geojson: {
      type: [Object, Array],
      default: () => ({})
    },
    /**
     * If tooltip.content is provided, render tooltip with the content on hover on a geojson feature.
     * tooltip.content - can be a string, HTMLElement, or function that returns string/HTMLElement
     * tooltip.oprions - leaflet tooltip options: https://leafletjs.com/reference-1.0.0.html#tooltip-option
     */
    tooltip: {
      type: Object,
      default: () => ({
        content: null,
        options: {}
      })
    },
    /**
     * Leaflet geojson options: https://leafletjs.com/reference-1.0.0.html#geojson-option
     */
    options: {
      type: Object,
      default: () => ({})
    }
  },
  data: () => ({
    geojsonLayer: null
  }),
  watch: {
    geojson: function () {
      this.refresh();
    },
    tooltip: function (n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    options: function (n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    }
  },
  mounted() {
    this.parentComponent = this.$parent;
    if (!this.parentComponent.mapObject) {
      return console.error('Parent element is not a map object');
    }
    this.refresh();
  },
  destroyed() {
    this.remove();
  },
  methods: {
    refresh() {
      this.remove();
      const map = this.parentComponent.mapObject;
      this.geojsonLayer = geoJSON(this.geojson, this.options);

      // bind tooltip
      if (this.tooltip.content) this.geojsonLayer.bindTooltip(this.tooltip.content, this.tooltip.options);

      // Add click event handler
      this.geojsonLayer.on('click', evt => {
        /**
         * Leaflet click event(ref: https://leafletjs.com/reference-1.5.0.html#event)
         *
         * @event click
         * @type {MouseEvent}
         */
        this.$emit('click', evt);
      });
      this.geojsonLayer.addTo(map);
    },
    remove() {
      this.geojsonLayer && this.parentComponent.mapObject.removeLayer(this.geojsonLayer);
    }
  }
};
</script>
