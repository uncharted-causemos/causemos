import _ from 'lodash';
import * as d3 from 'd3';
import mapboxgl from 'mapbox-gl';
import { BASE_LAYER } from '@/utils/map-util-new';
import { chartValueFormatter } from '@/utils/string-util';
import { COLOR_PALETTE_SIZE } from '@/utils/colors-util';

export const ETHIOPIA_BOUNDING_BOX = {
  TOP: 18,
  LEFT: 31,
  BOTTOM: 0,
  RIGHT: 51
};

const ORIGINAL_WORKER_URL = mapboxgl.workerUrl;
const ORIGINAL_WORKER_COUNT = mapboxgl.workerCount;

export const STYLE_URL_PREFIX = '/api/map/styles/';
export const STYLE_URL = `${STYLE_URL_PREFIX}${BASE_LAYER.DEFAULT}`;
export const BASE_MAP_OPTIONS = {
  style: STYLE_URL,
  mapStyle: STYLE_URL, // alias for 'style' for wm-map component
  transformRequest: resolveBaseMapTileUrl
};

/**
 * Resolve and replace `wmmap:` protocol with correct base url for the tile request
 * @param {String} url mapbox resource request url
 * @param {String} resourceType mapbox resource tyle
 */
export function resolveBaseMapTileUrl(url) {
  const wmProtocol = 'wmmap://';
  if (url.startsWith(wmProtocol)) {
    const baseUrl = `${window.location.protocol}//${window.location.host}/api/map/`;
    return {
      url: url.replace(wmProtocol, baseUrl)
    };
  }
}

/**
 * Enable tile requests caching for mapbox so that same tile requests made concurrently can be cached and served from it.
 */
export async function enableConcurrentTileRequestsCaching() {
  // Note: There's no easy way to intercept requests or tile load calls using mapbox public api at the moment.
  //
  // (There's a way to register custom source worker that does tile fetching/loading using public api but that requires writing entire
  //  data-loading, parsing, processing pipeline since mapbox doesn't expose related classes and utils,
  //  VectorTileWorkerSource specifically, as public for extension.
  //  refs: addSourceType at https://github.com/mapbox/mapbox-gl-js/blob/master/src/ui/map.js#L1427
  //  https://github.com/mapbox/mapbox-gl-js/blob/master/src/source/source.js
  //  https://github.com/mapbox/mapbox-gl-js/blob/master/src/source/worker_source.js)
  //
  // So, as a relatively simple work around, add a piece of code that intercepts the fetch requests to the mapbox
  // web worker source which can later be registered to mapbox instance and used for fetching/loading tiles background.
  // This injection is needed since a worker runs in its own thread and doesn't share context with the
  // main thread, we need to access the fetch object inside the worker context by injecting relevant code
  // to the original worker source.
  if (mapboxgl.workerUrl !== ORIGINAL_WORKER_URL) return;
  const mapboxWorkerSource = await fetch(mapboxgl.workerUrl).then(r => r.text());
  const blob = new Blob([injectNewFetch(mapboxWorkerSource)], { type: 'application/javascript' });
  mapboxgl.workerUrl = window.URL.createObjectURL(blob);
  // Use single global worker for background tasks (tile fetching, loading, processing etc). Since we share same data across multiple maps,
  // single worker would be sufficient
  mapboxgl.workerCount = 1;
}

/**
 * Disable the caching and fall back to the mapbox's default behaviour
 */
export function disableConcurrentTileRequestsCaching() {
  // Free memory by releasing the object URL and it's blob/file associated to it
  if (mapboxgl.workerUrl !== ORIGINAL_WORKER_URL) {
    window.URL.revokeObjectURL(mapboxgl.workerUrl);
    mapboxgl.workerUrl = ORIGINAL_WORKER_URL;
    mapboxgl.workerCount = ORIGINAL_WORKER_COUNT;
  }
}

function injectNewFetch(source) {
  const injectionCode = `(${interceptFetch.toString()})();`;
  return injectionCode + source;
}

function interceptFetch() {
  // This function is to be toString and it should not know about the parent scope
  // self is the reference to the global scope of a worker
  const originalFetch = self.fetch;
  const TILE_URLS = ['/api/maas/tiles', '/api/map/vector-tiles'];
  const requestCache = new Map();
  const CACHE_EXPIRE = 300;

  self.fetch = (...args) => {
    const { url, signal } = new Request(args[0], args[1]); // webpack/babel fails with ...args here :(
    const cacheKey = TILE_URLS
      .filter(tUrl => (url && url.includes(tUrl)))
      .map(tUrl => url.substring(url.indexOf(tUrl)))[0];
    if (!cacheKey) return originalFetch(...args);

    function makeCachedFetchRequest() {
      let request = requestCache.get(cacheKey);
      const reqSignal = request && request.signal; // abort signal from the cached request

      // If there is no cached request or the cached one is already aborted, make a new request and cache it.
      // Each cache object will be expired after CACHE_EXPIRE ms
      // Note: Mapbox abort fetch requests for tiles when the request is no longer valid (eg. when zoom level changes)
      if (!request || reqSignal.aborted) {
        clearTimeout(request && request.timeout); // clear previous timeout if exists
        request = {
          signal,
          promise: originalFetch(...args),
          timeout: setTimeout(() => {
            requestCache.delete(cacheKey);
          }, CACHE_EXPIRE)
        };
        requestCache.set(cacheKey, request);
        return request.promise.then(res => res.clone());
      }
      return request.promise.then(res => res.clone()).catch(error => {
        // If cached request you are waiting on for the response is aborted before you
        // get the response, make a new cached request
        if (error.name === 'AbortError') return makeCachedFetchRequest();
        throw error;
      });
    }
    return makeCachedFetchRequest();
  };
}

export function isLayerLoaded(map, layerId) {
  return typeof map.getLayer(layerId) !== 'undefined';
}


export function diffExpr(oldValExpr, newValExpr, showPercentChange = false) {
  if (showPercentChange) {
    return [
      'case',
      // Both zero, return 0
      ['all', ['==', 0, oldValExpr], ['==', 0, newValExpr]], 0,
      // Otherwise, calculate the percentage
      ['*', ['/', ['-', newValExpr, oldValExpr], ['abs', oldValExpr]], 100]
    ];
  }
  return ['-', newValExpr, oldValExpr];
}

/**
 * @param {String} property - Name of the property for the geojson feature for applying color
 * @param {Array} dataDomain - Data domain in the form of [min, max]
 * @param {Array} colorScheme - Color scheme, list of colors
 * @param {Function} scaleFn - d3 scale function
 * @param {Boolean} useFeatureState - use feature state instead of a property
 */
function colorExpr(property, domain, colorScheme, scaleFn = d3.scaleLinear, useFeatureState = false, relativeTo, showPercentChange = false, continuous = false, diverging = false) {
  const colors = continuous ? d3.quantize(d3.interpolateRgbBasis(colorScheme), COLOR_PALETTE_SIZE) : colorScheme;
  const stops = !_.isNil(relativeTo) || diverging
    ? createDivergingColorStops(domain, colors, scaleFn)
    : createColorStops(domain, colors, scaleFn);
  const getter = useFeatureState ? 'feature-state' : 'get';
  const baselineValueExpr = ['case', ['!=', null, [getter, relativeTo]], [getter, relativeTo], [getter, '_baseline']];
  const valueExpr = !_.isNil(relativeTo)
    ? diffExpr(baselineValueExpr, [getter, property], showPercentChange)
    : [getter, property];

  return [
    'step',
    valueExpr,
    ...stops

  ];
  // return continuous
  //   ? [
  //     'interpolate',
  //     ['linear'],
  //     valueExpr,
  //     ...stops
  //   ]
  //   : [
  //     'step',
  //     valueExpr,
  //     ...stops
  //   ];
}

// Produce an array representing color stops
// For example, with [c1, v1, c2, v2, c3], colors will be mapped as following
// * c1, when value is less than v1
// * c2, when value is between v1 and v2
// * c3, when value is greater than or equal to v2
export function createColorStops(domain, colors, scaleFn) {
  const scale = scaleFn()
    .domain(domain)
    .range([0, 1]);
  const stops = [];
  const numColors = colors.length;
  const step = 1 / numColors;
  colors.forEach((color, index) => {
    stops.push(color);
    const i = index + 1;
    if (i < colors.length) stops.push(scale.invert(i * step));
  });
  return stops;
}

export function createDivergingColorStops(domain, colors, scaleFn) {
  const max = Math.max(...domain.map(Math.abs));
  const scale = scaleFn()
    .domain([-max, 0, max])
    .range([-1, 0, 1]);
  const stops = [];
  const numColors = colors.length;
  const step = 2 / numColors;
  colors.forEach((color, index) => {
    stops.push(color);
    const i = index + 1;
    if (i < colors.length) stops.push(scale.invert((i * step) - 1));
  });
  return stops;
}

/**
 * Create a fill type mapbox layer style object for polygons
 *
 * @param {String} property - Name of the property for the geojson feature for applying color
 * @param {Array} dataDomain - Data domain in the form of [min, max]
 * @param {Array} filterDomain - Filter domain in the form of [min, max]
 * @param {Array} colorOptions - Color options
 * @param {Boolean} useFeatureState - use feature state instead of a property
 */
export function createHeatmapLayerStyle(property, dataDomain, filterDomain, colorOptions, useFeatureState = false, relativeTo, showPercentChange = false) {
  const opacity = _.isNil(colorOptions.opacity) ? 1 : colorOptions.opacity;
  const style = {
    type: 'fill',
    paint: {
      'fill-antialias': false,
      'fill-color': colorExpr(property, dataDomain, colorOptions.scheme, colorOptions.scaleFn, useFeatureState, relativeTo, showPercentChange, colorOptions.isContinuous, colorOptions.isDiverging),
      'fill-opacity': opacity
    }
  };
  if (useFeatureState) {
    // TODO: split this into two functions (one for feature state and one for grid map style)
    const missingProperty = [
      ['==', null, ['feature-state', property]], 0.0
    ];
    !_.isNil(relativeTo) && missingProperty.push(
      ['all', ['==', null, ['feature-state', relativeTo]], ['==', null, ['feature-state', '_baseline']]], 0.0
    );
    const baselineValueExpr = ['case', ['!=', null, ['feature-state', relativeTo]], ['feature-state', relativeTo], ['feature-state', '_baseline']];
    const propertyGetter = _.isNil(relativeTo)
      ? ['feature-state', property]
      : diffExpr(baselineValueExpr, ['feature-state', property], showPercentChange);
    style.paint['fill-opacity'] = [
      'case',
      ...missingProperty,
      ['==', 'NaN', ['to-string', propertyGetter]], 0.0,
      ['<', propertyGetter, filterDomain.min], 0.0,
      ['>', propertyGetter, filterDomain.max], 0.0,
      ['==', true, ['feature-state', '_isHidden']], 0.0,
      opacity
    ];
  }
  return style;
}

export function createPointsLayerStyle(property, dataDomain, colorOptions, filter = ['all']) {
  const cExpr = colorExpr(property, dataDomain, colorOptions.scheme, colorOptions.scaleFn, false, undefined, false, colorOptions.isContinuous, colorOptions.isDiverging);
  return {
    type: 'circle',
    paint: {
      'circle-radius': 5,
      'circle-color': cExpr,
      'circle-stroke-color': colorOptions.scheme[colorOptions.scheme.length - 1],
      'circle-opacity': colorOptions.opacity,
      'circle-stroke-width': 1
    },
    filter: filter
  };
}

/**
 * Transfrom map data to map points data
 * @param {Object[]} mapData.geoJSON - geoJSON object
 * @param {number}   mapData.minCount - feature with lowest mentions
 * @param {number}   mapData.maxCount - feature with highest mentions
 * @param {Object}   options - options
 * @param {number}   options.baseSize - base size of the circle
 * @returns {Object[]}
 */
export function transformMapData(mapData = {}, options = {}) {
  const { geoJSON, minCount, maxCount } = mapData;
  if (_.isEmpty(geoJSON)) return {};

  const baseSize = options.baseSize || 2000; // base size of circle (in meters)

  const sizeFn = (count, min, max) => {
    if (max === min) return baseSize;
    const size = Math.sqrt((count / (max - min)) * baseSize);
    return Math.max(size, 3); // keep the smallest radius to 3
  };

  const result = geoJSON.features.map(datum => {
    datum.properties.radius = sizeFn(datum.properties.count, minCount, maxCount);
    return datum;
  });
  return result;
}

export const createMapLegendData = (domain, colors, scaleFn, isDiverging) => {
  const absMax = Math.max(...domain.map(Math.abs));
  const min = isDiverging ? -absMax : domain[0];
  const max = isDiverging ? absMax : domain[1];
  const stops = isDiverging
    ? createDivergingColorStops(domain, colors, scaleFn)
    : createColorStops(domain, colors, scaleFn);
  const labels = [];
  // process with color stops (e.g [c1, v1, c2, v2, c3]) where cn is color and vn is value.
  // const format = (v) => chartValueFormatter(stops[1], stops[stops.length - 2])(v);
  const format = (v) => chartValueFormatter(min, max)(v);
  stops.forEach((item, index) => {
    if (index % 2 !== 0) {
      labels.push(format(item));
    }
  });
  labels.push(format(max));
  const data = [];
  colors.forEach((item, index) => {
    data.push({ color: item, label: labels[index] });
  });
  data[0].decor = format(min);
  return data;
};
