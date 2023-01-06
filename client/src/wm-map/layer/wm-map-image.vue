<template>
  <div />
</template>

<script>
import layerBase from './layerBase';
import layerUtils from './layerUtils';

export default {
  name: 'WmMapImage',
  mixins: [layerBase, layerUtils],
  props: {
    coords: {
      type: Array, // {lat: number, long: number}[]
      required: true,
    },
  },
  watch: {
    source() {
      this._updateSource();
    },
  },
  mounted() {
    // Add source if a source with given id doens't exist
    // There can be multiple layers with a single data source so we only add the same source once
    if (!this.map.getSource(this.sourceId)) this._updateSource();
    this._addLayer();
  },
  methods: {
    _updateSource() {
      // Expects a source image url from the source prop (this.source)
      const imageUrl = this.source;
      if (!imageUrl) return; // ie. ignore if the source is not provided
      // ignore of coords are not provided
      if (this.coords.length === 0) return;

      const layerDefs = this.$_layerDefsBySource(this.sourceId);
      // remove the previous source and add updated one with new image url
      // this will remove all layer attached to the source, if any
      this.$_removeSource(this.sourceId);
      const payload = {
        type: 'image',
        url: imageUrl,
        coordinates: this.convertToMapBoxCoords(this.coords),
      };
      this.map.addSource(this.sourceId, payload);
      // Re-add the layers
      layerDefs.forEach((layer) => this.map.addLayer(layer));
    },
    _addLayer() {
      this.$_removeLayer(this.layerId);
      this.map.addLayer(
        {
          id: this.layerId,
          type: 'raster',
          source: this.sourceId,
        },
        this.beforeId
      );
    },
    convertToMapBoxCoords(coords) {
      // mapbox gl expects an array with four pairs in the format [long, lat]
      //  starting top-left then clock-wise
      const result = [];

      // top-left
      result.push([coords[0].long, coords[0].lat]);

      // top-right
      result.push([coords[0].long, coords[1].lat]);

      // bottom-right
      result.push([coords[1].long, coords[1].lat]);

      // bottom-left
      result.push([coords[1].long, coords[0].lat]);

      return result;
    },
  },
};
</script>
