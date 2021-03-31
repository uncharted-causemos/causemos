import _ from 'lodash';
import mapboxgl from 'mapbox-gl';

export const ETHIOPIA_BOUNDING_BOX = {
  TOP: 18,
  LEFT: 31,
  BOTTOM: 0,
  RIGHT: 51
};

const ORIGINAL_WORKER_URL = mapboxgl.workerUrl;
const ORIGINAL_WORKER_COUNT = mapboxgl.workerCount;

export const STYLE_URL = '/api/map/styles';
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

/**
 * @param {String} property - Name of the property for the geojson feature for applying color
 * @param {Array} dataDomain - Data domain in the form of [min, max]
 * @param {Array} colors - Color scheme, list of colors
 * @param {Function} scaleFn - d3 scale function
 */
function interpolateColor(property, domain, colors, scaleFn = d3.scaleLinear) {
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
}

/**
 * Create a fill type mapbox layer style object for polygons
 *
 * @param {String} property - Name of the property for the geojson feature for applying color
 * @param {Array} dataDomain - Data domain in the form of [min, max]
 * @param {Array} colors - Color scheme, list of colors
 * @param {Function} scaleFn - d3 scale function
 */
export function createHeatmapLayerStyle(property, dataDomain, colors, scaleFn = d3.scaleLinear) {
  return {
    type: 'fill',
    paint: {
      'fill-antialias': false,
      'fill-color': interpolateColor(property, dataDomain, colors, scaleFn),
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        1, // opacity to 1 on hover
        0.6 // default opacity
      ]
    },
    filter: ['all', ['has', property]]
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
