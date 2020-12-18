<template>
  <div />
</template>

<script>
import L from 'leaflet';
import _ from 'lodash';

import { createRasterPlot, COLOR_SCALES } from '@/utils/render-util';

export default {
  name: 'MapRasterLayer',
  props: {
    data: {
      type: Object,
      default: () => { return null; }
    },
    colorScale: {
      type: String,
      default: () => { return COLOR_SCALES.TURBO; }
    },
    dataIndex: {
      type: Number,
      default: () => { return 0; }
    },
    opacity: {
      type: Number,
      default: () => { return 0.8; }
    }
  },
  data: () => ({
    domain: []
  }),
  watch: {
    data: function baseDataChanged(n, o) {
      if (_.isEqual(n, o)) return;
      this.refresh();
    },
    dataIndex: function (n, o) {
      if (_.isEqual(n, o)) return;
      this.renderData(n);
    }
  },
  mounted() {
    this.parentComponent = this.$parent;
    if (!this.parentComponent.mapObject) {
      return console.error('Parent element is not a map object');
    }
    this.parentMap = this.parentComponent.mapObject;
    this.refresh();
  },
  destroyed() {
    this.imageLayer && this.parentMap.removeLayer(this.imageLayer);
  },
  methods: {
    refresh() {
      this.imageLayer && this.parentMap.removeLayer(this.imageLayer);
      this.addRasterLayer();
      this.renderData(this.dataIndex);
    },
    addRasterLayer() {
      if (_.isEmpty(this.data)) return;
      const { rasters, noDataValue, latLngBbox, mins, maxes, imageWidth, imageHeight } = this.data;
      const [minLng, minLat, maxLat, maxLng] = latLngBbox;
      const min = Math.min(...mins);
      const max = Math.max(...maxes);
      const imageBounds = [[minLat, minLng], [maxLng, maxLat]];
      this.domain = [min, max];

      this.rasterPlot = createRasterPlot({
        data: rasters,
        noDataValue,
        domain: this.domain,
        imageWidth,
        imageHeight,
        colorScale: this.colorScale
      });

      this.imageLayer = L.imageOverlay('', imageBounds, { opacity: this.opacity }).addTo(this.parentMap);
      const imgStyle = this.imageLayer.getElement().style;
      // with pixelated image-rendering, browser preserve the image's pixelated style by using nearest-neighbour scaling when scaling up the image
      // crisp-edges is fall back for browser that doesn't support this property.
      imgStyle.cssText = imgStyle.cssText + `
        image-rendering: -moz-crisp-edges;
        image-rendering: -webkit-crisp-edges;
        image-rendering: crisp-edges;
        image-rendering: pixelated;
      `;
    },
    renderData(dataIndex = 0) {
      if (!this.imageLayer || !this.rasterPlot) return;
      this.imageLayer.setUrl(this.rasterPlot.render(dataIndex).toImageUrl());
    }
  }
};
</script>
