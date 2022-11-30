<template>
  <div />
</template>

<script>

import mapboxgl from 'maplibre-gl';
import { eventEmitter } from '../mixins';

// Reference: https://docs.mapbox.com/mapbox-gl-js/example/using-box-queryrenderedfeatures/

const BOX_STYLE = `
  background: #888;
  border: 2px solid #888;
  position: relative;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  opacity: 0.3;
`;
export default {
  name: 'WmMapSelectbox',
  mixins: [eventEmitter],
  data: () => ({
    start: null,
    current: null,
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
    // Set `true` to dispatch the event before other functions
    // call it. This is necessary for disabling the default map
    // dragging behaviour.
    this.mapCanvas.addEventListener('mousedown', this.onMouseDown, true);
  },
  unmounted() {
    this.finish();
  },
  methods: {
    // Return the xy coordinates of the mouse position
    mousePos(evt) {
      const rect = this.mapCanvas.getBoundingClientRect();
      const position = new mapboxgl.Point(
        evt.clientX - rect.left - this.mapCanvas.clientLeft,
        evt.clientY - rect.top - this.mapCanvas.clientTop
      );
      return position;
    },
    onMouseDown(evt) {
      if (!(evt.shiftKey && evt.button === 0)) return;

      // Disable default drag and box zoom
      this.map.dragPan.disable();
      this.map.boxZoom.disable();

      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
      document.addEventListener('keydown', this.onKeyDown);
      this.start = this.mousePos(evt);
    },
    onMouseMove(evt) {
      this.current = this.mousePos(evt);
      // Append the box element if it doesnt exist
      if (!this.box) {
        this.box = document.createElement('div');
        this.box.classList.add('wm-map-selectbox');
        this.box.style.cssText = BOX_STYLE;
        this.mapCanvas.appendChild(this.box);
      }
      const minX = Math.min(this.start.x, this.current.x);
      const maxX = Math.max(this.start.x, this.current.x);
      const minY = Math.min(this.start.y, this.current.y);
      const maxY = Math.max(this.start.y, this.current.y);

      const pos = 'translate(' + minX + 'px,' + minY + 'px)';
      this.box.style.transform = pos;
      this.box.style.WebkitTransform = pos;
      this.box.style.width = maxX - minX + 'px';
      this.box.style.height = maxY - minY + 'px';
    },
    onMouseUp(evt) {
      this.finish([this.start, this.mousePos(evt)]);
    },
    onKeyDown(evt) {
      const ESC_KEY_CODE = 27;
      if (evt.keyCode === ESC_KEY_CODE) this.finish();
    },
    finish(bbox) {
      // Remove added evnet handlers
      document.removeEventListener('mousemove', this.onMouseMove);
      document.removeEventListener('keydown', this.onKeyDown);
      document.removeEventListener('mouseup', this.onMouseUp);

      if (this.box) {
        this.box.parentNode.removeChild(this.box);
        this.box = null;
      }
      if (bbox) {
        this.$_emitEvent('select-box', { bbox });
      }
      this.map.dragPan.enable();
      this.map.boxZoom.enable();
    }
  }
};
</script>
