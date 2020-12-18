import L from 'leaflet';
import _ from 'lodash';

export const ETHIOPIA_BOUNDING_BOX = {
  TOP: 18,
  LEFT: 31,
  BOTTOM: 0,
  RIGHT: 51
};

/**
 * From given points return new array of points witin provided bounds
 * @param {Object[]} points - array of object with lat and lng
 * @param {number} points[].lat - latitude
 * @param {number} points[].lng - longitude
 * @param {LatLng[]} bounds - bounds in form of [[lat, lng], [lat, lng]]
 */
const within = (points = [], bounds = []) => {
  if (bounds.length === 0) return [];
  const checker = L.latLngBounds(bounds);
  return points.filter(point => {
    return checker.contains(L.latLng(point));
  });
};

/**
 * Transfrom map data to map points data
 * @param {Object[]} mapData.geoJSON - geoJSON object
 * @param {number}   mapData.minCount - feature with lowest mentions
 * @param {number}   mapData.maxCount - feature with highest mentions
 * @param {Object}   options - options
 * @param {number}   options.baseSize - base size of the circle
 * @returns {Object[]}
 */
const transformMapData = (mapData = {}, options = {}) => {
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
};


export default {
  within,
  transformMapData
};
