/**
 * Vue mixins. Component options (properties, methods etc) that can be reusable goes here.
 * Note: It is good practice to name mixin properties starting with `$_` to avoid overlapping properties.
 * (Use `$_` since `$` is reserved for vue private properties and `_` for component private properties)
 */

export const eventEmitter = {
  methods: {
    /**
     * Emits event with the event name and the data augmented by the map instance and the component which fires the event.
     * @param {String} name - Event name
     * @param {Object} data - Event data
     */
    $_emitEvent(name, data) {
      this.$emit(name, {
        map: this.map,
        component: this,
        ...data,
      });
    },
    /**
     * Emits an event with event data that wraps mapbox event.
     * @param {string} mapboxEvent - Map box event
     * @param {*} data - Optional event data
     */
    $_emitMapEvent(mapboxEvent, data = {}) {
      this.$_emitEvent(mapboxEvent.type, {
        mapboxEvent: mapboxEvent,
        ...data,
      });
    },
  },
};
