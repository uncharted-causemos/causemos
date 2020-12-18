<template>
  <div />
</template>

<script>
import L from 'leaflet';

export default {
  name: 'MapPoints',
  props: {
    /**
     * Array of objects containing geo coordinates and style options
     * {Object[]} data - points data array
     * {number} data[].lat - latitude
     * {number} data[].lng - longitude
     * {Object} data[].metadata - optional metadata for each data point
     * {Object} data[].options - leaflet circle options: https://leafletjs.com/reference-1.5.0.html#circle-option
     */
    data: {
      type: Array,
      default: () => ([])
    },
    /**
     * If tooltip.content is provided, render tooltip with the content on hover on a point.
     * {Object}                      tooltip - a tooltp option
     * {string|HTMLElement|Function} tooltip.content - can be a string, HTMLElement, or function that returns string/HTMLElement
     * {Object}                      tooltip.options - leaflet tooltip options: https://leafletjs.com/reference-1.0.0.html#tooltip-option
     */
    tooltip: {
      type: Object,
      default: () => ({
        content: null,
        options: {}
      })
    }
  },
  data: () => ({
    pointsLayer: null
  }),
  watch: {
    data: function () {
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
      this.pointsLayer = L.layerGroup();
      const map = this.parentComponent.mapObject;
      for (const { lat, lng, options = {}, metadata = {} } of this.data) {
        const circle = L.circle([lat, lng], options);
        // add metadata to the circle object
        circle.metadata = metadata;

        // bind tooltip
        if (this.tooltip.content) circle.bindTooltip(this.tooltip.content, this.tooltip.options);

        circle.on('click', evt => {
          L.DomEvent.stopPropagation(evt);
          /**
           * Leaflet click event(ref: https://leafletjs.com/reference-1.5.0.html#event)
           * @event click
           * @type {MouseEvent}
           */
          this.$emit('click', evt);
        });

        this.pointsLayer.addLayer(circle);
      }

      this.pointsLayer.addTo(map);
    },
    remove() {
      if (this.pointsLayer) this.parentComponent.mapObject.removeLayer(this.pointsLayer);
    }
  }
};
</script>
