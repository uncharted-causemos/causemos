/**
 * Utility functions to mapbox layers and sources.
 * Some are borrowed from https://github.com/stevage/mapbox-gl-utils/blob/master/src/index.js
 */
export default {
  methods: {
    $_layersBySource(source) {
      return this.$_layerDefsBySource(source).map((l) => l.id);
    },
    $_layerDefsBySource(source) {
      return this.map.getStyle().layers.filter((l) => l.source === source);
    },
    $_removeLayer(layer) {
      const remove = this.map.getLayer(layer);
      remove && this.map.removeLayer(layer);
    },
    $_removeSource(source) {
      // remove layers that use this source first
      const layers = this.$_layersBySource(source);
      layers.forEach((layer) => this.$_removeLayer(layer));
      const remove = this.map.getSource(this.sourceId);
      remove && this.map.removeSource(this.sourceId);
    },
  },
};
