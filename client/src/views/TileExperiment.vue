<template>
  <div
    v-if="ready"
    class="container-fluid">
    <div
      v-for="(spec, index) in mapSpecs"
      :key="index"
      class="wm-map-container"
      :style="`grid-area: area${index}` "
    >
      <wm-map
        v-bind="mapOptions"
        :bounds="bounds"
        @move="syncBounds"
        @load="onMapLoad"
      >
        <wm-map-vector
          :source-id="'tileSource'"
          :source="tileSource"
          :source-layer="'maas'"
          :layer-id="layerId"
          :layer="spec.style"
        />
      </wm-map>
      <div class="filter">
        <label>Filter</label><br>
        <input
          v-model="spec.filter"
          type="checkbox">
      </div>
      <slider-continuous-range
        v-model="spec.range"
        class="range-slider"
        :height="200"
        :margin="40"
        :min="spec.extent[0]"
        :max="spec.extent[1]"
        :color-option="spec.colorOption"
      />
    </div>
  </div>
</template>

<script>

import _ from 'lodash';
import { WmMap, WmMapVector } from '@/wm-map';
import SliderContinuousRange from '@/components/widgets/slider-continuous-range';
import * as d3 from 'd3';
import { getColors } from '@/utils/colors-util';
import { BASE_MAP_OPTIONS, enableConcurrentTileRequestsCaching, disableConcurrentTileRequestsCaching, ETHIOPIA_BOUNDING_BOX } from '@/utils/map-util';

const FILTER_ANIMATION_FPS = 15;
/**
 * @param {String} property - Name of the property for the geojson feature for applying color
 * @param {Array} dataDomain - Data domain in the form of [min, max]
 * @param {Array} colors - Color scheme, list of colors
 * @param {Function} scaleFn - d3 scale function
 */
const interpolateColor = (property, domain, colors, scaleFn = d3.scaleLinear) => {
  const scale = scaleFn()
    .domain(domain)
    .range([0, colors.length - 1]);
  const stops = [];
  colors.forEach((color, index) => {
    stops.push(scale.invert(index));
    stops.push(['to-color', color]);
  });
  return [
    'interpolate',
    ['linear'],
    ['get', property],
    ...stops
  ];
};

/**
 * Create a fill type mapbox layer style object for polygons
 *
 * @param {String} property - Name of the property for the geojson feature for applying color
 * @param {Array} dataDomain - Data domain in the form of [min, max]
 * @param {Array} colors - Color scheme, list of colors
 * @param {Function} scaleFn - d3 scale function
 */
const createPolygonLayerStyle = (property, dataDomain, colors, scaleFn = d3.scaleLinear) => {
  return {
    type: 'fill',
    paint: {
      'fill-antialias': false,
      'fill-color': interpolateColor(property, dataDomain, colors, scaleFn),
      'fill-opacity': 0.6
    },
    filter: ['all', ['has', property]]
  };
};

const createRangeFilter = ({ min, max }, prop) => {
  const lowerBound = ['>=', prop, Number(min)];
  const upperBound = ['<=', prop, Number(max)];
  return [lowerBound, upperBound];
};

export default {
  name: 'TileExperiment',
  components: {
    WmMap,
    WmMapVector,
    SliderContinuousRange
  },
  data: () => ({
    ready: false,
    mapSpecs: [],
    bounds: [
      [ETHIOPIA_BOUNDING_BOX.LEFT, ETHIOPIA_BOUNDING_BOX.BOTTOM],
      [ETHIOPIA_BOUNDING_BOX.RIGHT, ETHIOPIA_BOUNDING_BOX.TOP]
    ]
  }),
  watch: {
    mapSpecs: {
      handler() {
        this.updateMapLayerFilter();
      },
      deep: true
    }
  },
  created() {
    enableConcurrentTileRequestsCaching().then(() => (this.ready = true));
    this.mapOptions = {
      ...BASE_MAP_OPTIONS
    };
    const tileSpec = [
      { model: 'cropland_model', runId: 'df3f4f29f433ca66ca71cf5764c757559a1f1268a53aba44255e329c128cb263', feature: 'cropland', date: '2018-01-01T00:00:00.000Z', valueProp: 'value0' },
      { model: 'PIHM', runId: '044bceb80620ce848ea7dc1b136f9f9b9ef05d497c953b124134d9dff94c24f7', feature: 'surface water', date: '2018-01-01T00:00:00.000Z', valueProp: 'value1' },
      { model: 'population_model', runId: '93239aa323b3936a237029ff55557e5b8acc703c7df75bd6ff9a3d6c006a241', feature: 'population', date: '2018-01-01T00:00:00.000Z', valueProp: 'value2' },
      { model: 'consumption_model', runId: '1aee48cd4d5286732367dc223f7b21e97bc23619815f7140763c2f9f7541dfac', feature: 'consumption per capita per day', date: '2018-01-01T00:00:00.000Z', valueProp: 'value3' }
    ];
    this.tileSource = `${window.location.protocol}//${window.location.host}/api/maas/tiles/{z}/{x}/{y}?specs=${JSON.stringify(tileSpec)}`;
    this.layerId = 'tileLayer';
    const mapSpecs = [
      {
        valueProp: 'value0',
        extent: [0, 1],
        colorOption: {
          color: 'WM_GREEN',
          scaleFn: d3.scaleLinear
        }
      },
      {
        valueProp: 'value0',
        extent: [0, 1],
        colorOption: {
          color: 'WM_GREEN',
          scaleFn: d3.scaleLinear
        }
      },
      {
        valueProp: 'value1',
        extent: [-0.001113482207680742, 0.0020618765614926816],
        colorOption: {
          color: 'WM_BLUE',
          scaleFn: d3.scaleSymlog
        }
      },
      {
        valueProp: 'value2',
        extent: [0, 28000],
        colorOption: {
          color: 'WM_RED',
          scaleFn: d3.scaleSymlog
        }
      },
      {
        valueProp: 'value3',
        extent: [0, 10],
        colorOption: {
          color: 'WM_RED',
          scaleFn: d3.scaleSymlog
        }
      }
    ];
    this.mapSpecs = mapSpecs.map(spec => {
      const { valueProp, extent, colorOption } = spec;
      return {
        ...spec,
        range: extent,
        style: createPolygonLayerStyle(valueProp, extent, getColors(colorOption.color, 20), colorOption.scaleFn),
        filter: false
      };
    });
  },
  unmounted() {
    disableConcurrentTileRequestsCaching();
  },
  methods: {
    onMapLoad(event) {
      // for this experiment
      event.map.showTileBoundaries = true;
    },
    updateMapLayerFilter: _.throttle(function () {
      // combine all range filters
      const filter = this.mapSpecs.reduce((prev, cur) => {
        if (!cur.filter) return prev;
        return [...prev, ...createRangeFilter(cur.range, cur.valueProp)];
      }, []);
      this.mapSpecs.forEach((spec) => {
        const all = ['all', ['has', spec.valueProp], ...filter];
        // if this map's filter is not already added to all
        if (!spec.filter) {
          all.push(...createRangeFilter(spec.range, spec.valueProp));
        }
        spec.style.filter = all;
      });
    }, 1000 / FILTER_ANIMATION_FPS),
    // Copied from analysis-map.vue
    syncBounds(event) {
      // Skip if move event is not originated from dom event (eg. not triggered by user interaction with dom)
      // We ignore move events from other maps which are being synced with the master map to avoid situation
      // where they also trigger prop updates and fire events again to create infinite loop
      const originalEvent = event.mapboxEvent.originalEvent;
      if (!originalEvent) return;

      const map = event.map;
      const component = event.component;

      // Disable camera movement until next tick so that the master map doesn't get updated by the props change
      // Master map is being interacted by user so camera movement is already applied
      component.disableCamera();

      // get properties of the map and update vue props
      this.bounds = map.getBounds();
      this.$nextTick(() => {
        component.enableCamera();
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import "~styles/variables";
.container-fluid {
  display: grid;
  height: 90vh;
  grid-template-columns: 700px auto auto;
  grid-template-rows: auto;
  grid-template-areas:
    "area0 area1 area2"
    "area0 area3 area4"
}
.wm-map-container {
  height: 250px;
  width: 250px;
  position: relative;
}
.wm-map-container:first-of-type {
  height: 100%;
  width: 700px;
}
.range-slider {
  position: absolute;
  z-index: 999;
  top: 0;
}
.filter {
  position: absolute;
  z-index: 999;
  right: 0px;
  top: 0;
}
</style>
