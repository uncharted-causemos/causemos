<template>
  <div />
</template>

<script>
import L from 'leaflet';
import _ from 'lodash';
import MapStyles from '@/utils/map-styles';

const DEFAULT_RECTANGLE_OPTIONS = Object.freeze({
  color: MapStyles.COLOR_BOUNDING_BOX
});

export default {
  name: 'MapSelectBox',
  props: {
    initialBounds: {
      type: Object,
      default: null
    },
    // when set to false, remove selection box after emiting selection event
    persist: {
      type: Boolean,
      default: true
    }
  },
  data: () => ({
    rectangle: null,
    parentComponent: null,
    usingBoundingSelect: false,
    boundingSelect: { start: null, end: null }
  }),
  computed: {
    bounds() {
      const { start, end } = this.boundingSelect;
      const bounds = L.latLngBounds(start, end);
      return start && end && !_.isEqual(start, end) ? {
        northEast: bounds._northEast,
        southWest: bounds._southWest
      } : null;
    }
  },
  watch: {
    initialBounds() {
      if (this.initialBounds) {
        this.removeSelection();
        this.boundingSelect = {
          start: this.initialBounds.southWest,
          end: this.initialBounds.northEast
        };
        const bounds = L.latLngBounds(this.boundingSelect.start, this.boundingSelect.end);
        this.rectangle = L.rectangle(bounds, DEFAULT_RECTANGLE_OPTIONS);
        this.rectangle.addTo(this.parentComponent.mapObject);
        this.attachDraggableEventsToRectangle();
      }
    }
  },
  mounted() {
    this.parentComponent = this.$parent;
    if (!this.parentComponent.mapObject) {
      return console.error('Parent element is not a map object');
    }
    this.enableBoundingBoxSelection();
  },
  destroyed() {
    const map = this.parentComponent.mapObject;
    this.removeSelection();
    map.off('layeradd', this.onLayerAdd);
    map.off('mousedown', this.onMouseDown);
    map.off('mousemove', this.onMouseMove);
    map.off('click', this.onClick);
  },
  methods: {
    onLayerAdd: _.debounce(function () {
      if (!this.rectangle) return;
      this.rectangle.bringToFront();
    }),
    onMouseDown(evt) {
      if (evt.originalEvent.shiftKey) {
        evt.originalEvent.preventDefault(); // Prevent text-highlight and further actions
        this.parentComponent.disableEvents();
        this.removeSelection();
        this.usingBoundingSelect = true;
        this.boundingSelect.start = evt.latlng;
        this.rectangle = L.rectangle(L.latLngBounds(this.boundingSelect.start, this.boundingSelect.start), DEFAULT_RECTANGLE_OPTIONS);
        this.rectangle.addTo(this.parentComponent.mapObject);
      }
    },
    onMouseMove(evt) {
      if (!this.usingBoundingSelect) return;
      const selection = this.boundingSelect;
      selection.end = evt.latlng;
      this.rectangle.setBounds(L.latLngBounds(selection.start, selection.end));
    },
    onClick(evt) {
      // Click event is fired after mouseup.
      if (!this.usingBoundingSelect) return;
      this.usingBoundingSelect = false;
      this.parentComponent.enableEvents();
      this.boundingSelect.end = evt.latlng;
      this.processBoundingSelection();
    },
    removeSelection() {
      this.boundingSelect = { start: null, end: null };
      this.rectangle && this.parentComponent.mapObject.removeLayer(this.rectangle);
    },
    enableBoundingBoxSelection() {
      const map = this.parentComponent.mapObject;
      map.boxZoom.disable();

      map.on('layeradd', this.onLayerAdd);

      // Start selection
      map.on('mousedown', this.onMouseDown);

      map.on('mousemove', this.onMouseMove);

      // Finish/execute selection
      map.on('click', this.onClick);
    },
    processBoundingSelection() {
      this.$emit('change-bounds', this.bounds);
      if (!this.bounds || !this.persist) this.removeSelection();
    },
    /**
     * Factory method that returns an event handler that moves
     * rectangle as you drag your mouse across the map
     */
    repositionRectangleFactory(initialCoords) {
      // current coordinates of mouse position
      let currentCoords = initialCoords;
      return mouseMoveEvent => {
        const delta = {
          lat: mouseMoveEvent.latlng.lat - currentCoords.lat,
          lng: mouseMoveEvent.latlng.lng - currentCoords.lng
        };
        // Move the rectangle by the same distance as the delta
        // between the initial and current location
        const currBounds = this.rectangle.getBounds();
        const currSouthWest = currBounds.getSouthWest();
        const currNorthEast = currBounds.getNorthEast();
        const newBounds = {
          start: {
            lat: currSouthWest.lat + delta.lat,
            lng: currSouthWest.lng + delta.lng
          },
          end: {
            lat: currNorthEast.lat + delta.lat,
            lng: currNorthEast.lng + delta.lng
          }
        };
        this.rectangle.setBounds(L.latLngBounds(newBounds.start, newBounds.end));
        this.boundingSelect = newBounds;
        // Respecify the cuurent coords
        currentCoords = mouseMoveEvent.latlng;
      };
    },
    attachDraggableEventsToRectangle() {
      const map = this.parentComponent.mapObject;
      this.rectangle.on('mousedown', mouseDownEvent => {
        mouseDownEvent.originalEvent.preventDefault(); // Prevent text-highlight and further actions
        const repositionRectangle = this.repositionRectangleFactory(mouseDownEvent.latlng);
        map.dragging.disable();
        map.on('mousemove', repositionRectangle);

        this.rectangle.on('mouseup mouseout', () => {
          map.off('mousemove', repositionRectangle);
          map.dragging.enable();
          this.processBoundingSelection();
        });
      });
    }
  }
};
</script>
