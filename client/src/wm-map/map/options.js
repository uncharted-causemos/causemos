// mapbox gl js options reference: https://docs.mapbox.com/mapbox-gl-js/api/#map
const mapBoxOptions = {
  /**
   * [lng, lat] or { lng, lat }
   */
  center: {
    type: [Object, Array],
    default: () => ([0, 0])
  },
  zoom: {
    type: Number,
    default: 0
  },
  bearing: {
    type: Number,
    default: 0
  },
  pitch: {
    type: Number,
    default: 0
  },
  minZoom: {
    type: Number,
    default: 2
  },
  maxZoom: {
    type: Number,
    default: 16
  },
  // bounds can either be number[][] representing the map bounds array or { value: number[][], options }
  // where options is the mapbox fitBounds option.
  bounds: {
    type: [Object, Array],
    default: undefined
  },
  // Mapbox style option: 'style' is a reserved prop for vue, so use 'mapStyle' intead
  mapStyle: {
    type: [Object, String],
    required: true
  },
  transformRequest: {
    type: Function,
    default: undefined
  },
  preserveDrawingBuffer: {
    type: Boolean,
    default: true
  }
};

const componentProps = {
  // component specific props
};

export default {
  ...mapBoxOptions,
  ...componentProps
};
