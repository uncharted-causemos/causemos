<template>
  <div />
</template>

<script>
import layerBase from './layerBase';
export default {
  name: 'WmMapGeojson',
  mixins: [layerBase],
  watch: {
    source(sourceData) {
      const source = this.map.getSource(this.sourceId);
      source && source.setData(sourceData);
    },
  },
  mounted() {
    this._addSource();
    this.map.addLayer(
      {
        id: this.layerId,
        source: this.sourceId,
        ...this.layer,
      },
      this.beforeId
    );
  },
  methods: {
    _addSource() {
      // Add source if the source with given id doens't exist
      // There can be multiple layers with a single data source so we only add the same source once
      if (this.map.getSource(this.sourceId)) return;
      this.map.addSource(this.sourceId, {
        type: 'geojson',
        generateId: true, // Requires a unique integer feature id to create hover higlight effect. See https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson-generateId
        data: this.source || {
          type: 'FeatureCollection',
          features: [],
        },
      });
    },
  },
};
</script>
