/**
 * Component options (properties, methods etc) that are common for all layers
 */

export default {
  props: {
    /**
     * Source and layer style specification: https://docs.mapbox.com/mapbox-gl-js/style-spec/
     */

    /**
     * Source Id
     */
    sourceId: {
      type: String,
      required: true,
    },
    /**
     * Source object or url for the layer
     * This can be omitted if there's already a source registered by other layer and same sourceId is provide
     */
    source: {
      type: [Object, String],
      default: undefined,
    },
    /**
     * Layer Id
     */
    layerId: {
      type: String,
      required: true,
    },
    /**
     * Layer style object excluding id and source property since they are provided by props
     */
    layer: {
      type: Object,
      required: true,
    },
    /**
     * Inject the new layer before layer=beforeId
     */
    beforeId: {
      type: String,
      default: undefined,
    },
  },
  watch: {
    'layer.paint': function (paint) {
      for (const [key, value] of Object.entries(paint)) {
        this.map.setPaintProperty(this.layerId, key, value);
      }
    },
    'layer.layout': function (layout) {
      for (const [key, value] of Object.entries(layout)) {
        this.map.setLayoutProperty(this.layerId, key, value);
      }
    },
    'layer.filter': function (filter) {
      this.map.setFilter(this.layerId, filter);
    },
  },
  mounted() {
    this.mapComponent = this.$parent;
    if (!this.mapComponent.map) {
      return console.error('Parent element is not a map object');
    }
    this.map = this.mapComponent.map;
  },
  unmounted() {
    if (this.map.getLayer(this.layerId)) this.map.removeLayer(this.layerId);
  },
};
