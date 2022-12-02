<template>
  <div />
</template>

<script>

import mapboxgl from 'maplibre-gl';
import { eventEmitter } from '../mixins';

const BOX_STYLE = `
  background: rgba(255, 0, 0, .05);
  border: 2px solid rgba(255, 0, 0, .75);
`;
export default {
  name: 'WmMapBoundingBox',
  mixins: [eventEmitter],
  props: {
    bbox: {
      type: Array, // of two points (top-left, and bottom-right) ordered as lng/lat
      required: true
    }
  },
  computed: {
    geoPoint1() { // e.g. [33.346337, 14.703160]
      return this.bbox[0];
    },
    geoPoint2() { // e.g. [47.850650, 3.443253]
      return this.bbox[1];
    }
  },
  data: () => ({
    box: null
  }),
  emits: ['select-box'],
  mounted() {
    this.mapComponent = this.$parent;
    if (!this.mapComponent.map) {
      return console.error('Parent element is not a map object');
    }
    this.map = this.mapComponent.map;
    this.mapCanvas = this.map.getCanvasContainer();

    this.map.on('viewreset', this.render);
    this.map.on('move', this.render);
    this.map.on('moveend', this.render);

    this.render();
  },
  watch: {
    bbox() {
      this.render();
    }
  },
  methods: {
    project(d) {
      return this.map.project(new mapboxgl.LngLat(d[0], d[1]));
    },
    render() {
      if (this.box) {
        this.box.parentNode.removeChild(this.box);
        this.box = null;
      }
      if (!this.bbox || this.bbox.length === 0) return;
      const pixelPoint1 = this.project(this.geoPoint1);
      const pixelPoint2 = this.project(this.geoPoint2);

      this.box = document.createElement('div');
      this.box.classList.add('wm-map-selectbox');
      this.box.style.cssText = BOX_STYLE;
      this.mapCanvas.appendChild(this.box);

      const pos = 'translate(' + pixelPoint1.x + 'px,' + pixelPoint1.y + 'px)';
      this.box.style.transform = pos;
      this.box.style.WebkitTransform = pos;
      this.box.style.width = pixelPoint2.x - pixelPoint1.x + 'px';
      this.box.style.height = pixelPoint2.y - pixelPoint1.y + 'px';
    }
  }
};
</script>
