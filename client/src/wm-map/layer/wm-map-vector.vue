<template>
  <div />
</template>

<script>

import layerBase from './layerBase';
import layerUtils from './layerUtils';
import { eventEmitter } from '../mixins';

export default {
  name: 'WmMapVector',
  mixins: [layerBase, layerUtils, eventEmitter],
  emits: [
    'add-layer', 'update-source'
  ],
  props: {
    /**
     * Name of the layer within the vector source.
     * (A vector source can have multiple layers)
     */
    sourceLayer: {
      type: String,
      required: true
    },
    /**
     * A property to use as a feature id (for feature state). Either a property name, or an object of the form {<sourceLayer>: <propertyName>}.
     * https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#vector-promoteId
     */
    promoteId: {
      type: [String, Object],
      default: undefined
    },
    /**
     * Vector source max zoom
     */
    sourceMaxzoom: {
      type: Number,
      default: 22
    }
  },
  watch: {
    source() {
      this._updateSource();
    },
    sourceLayer() {
      this._addLayer();
    }
  },
  mounted() {
    // Add source if a source with given id doens't exist
    // There can be multiple layers with a single data source so we only add the same source once
    if (!this.map.getSource(this.sourceId)) this._updateSource();
    this._addLayer();
  },
  methods: {
    _updateSource() {
      // Expects a source tile url or a list of tile urls from the source prop (this.source)
      // ie. `url` or [url]
      const tileUrls = (typeof this.source === 'string') ? [this.source] : this.source;
      if (!tileUrls) return; // ie. ignore if the source is not provided

      const layerDefs = this.$_layerDefsBySource(this.sourceId);
      // remove the previous source and add updated one with new tile urls
      // this will remove all layer attached to the source
      this.$_removeSource(this.sourceId);
      const payload = {
        type: 'vector',
        promoteId: this.promoteId,
        tiles: tileUrls,
        maxzoom: this.sourceMaxzoom
      };
      this.map.addSource(this.sourceId, payload);
      // Re-add the layers
      layerDefs.forEach(layer => this.map.addLayer(layer, this.beforeId));
      this.$_emitEvent('update-source', {
        id: this.sourceId,
        ...payload
      });
    },
    _addLayer() {
      this.$_removeLayer(this.layerId);
      this.map.addLayer({
        'id': this.layerId,
        'source': this.sourceId,
        'source-layer': this.sourceLayer,
        ...this.layer
      }, this.beforeId);
      this.$_emitEvent('add-layer', {
        'id': this.layerId,
        'source': this.sourceId,
        'source-layer': this.sourceLayer
      });
    }
  }
};
</script>
