const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const request = require('request');
const requestAsPromise = rootRequire('/util/request-as-promise');

const Logger = rootRequire('/config/logger');

const CARTO_API_KEY = process.env.CARTO_MAP_API_KEY;
const API_KEY_PARAM = CARTO_API_KEY ? `?api_key=${CARTO_API_KEY}` : '';

/**
 * Proxy map raster tile requests for leaflet map.
 * Leaflet map cannot handle vector tile maps without extension
 */
router.get('/tiles', (req, res) => {
  const { s, x, y, z } = req.query;

  // Enterprise and Public Domains for CARTO MAPS
  const enterpriseDomain = `https://enterprise-${s}.basemaps.cartocdn.com`;
  const publicDomain = `https://cartodb-basemaps-${s}.global.ssl.fastly.net`;

  const domain = CARTO_API_KEY ? enterpriseDomain : publicDomain;

  // Construct the URL based on the presence of an ENTERPRISE API KEY
  const url = `${domain}/rastertiles/light_all/${z}/${x}/${y}.png${API_KEY_PARAM}`;
  request.get(url, (error) => {
    if (error && error.code) {
      Logger.info('Error ' + error.code);
      res.statusCode = 500;
      res.json({ error: error });
    }
  }).pipe(res);
});

/**
 * Proxy map vector tile requests for mapbox-gl-js
 * Use Carto API Key if provided
 */
router.get('/vector-tiles/:z/:x/:y', (req, res) => {
  const { x, y, z } = req.params;
  // const accessKey = 'pk.eyJ1Ijoib3dsZXhhbXBsZSIsImEiOiJja3I1M25pczAxNG40Mm5uM2Z1ZGhncm8xIn0.T0iwlmq0vEO49Tt8vE9Sxw';
  // const url = `https://tiles.basemaps.cartocdn.com/vectortiles/carto.streets/v1/${z}/${x}/${y}.mvt${API_KEY_PARAM}`;
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}.png`;
  // const url = `https://api.mapbox.com/v4/mapbox.satellite/${z}/${y}/${x}@2x.jpg90?access_token=${accessKey}`;
  request.get(url, (error) => {
    if (error && error.code) {
      Logger.info('Error ' + error.code);
      res.statusCode = 500;
      res.json({ error: error });
    }
  }).pipe(res);
});

/**
 * Retrieve enterprise carto stylesheet for mapbox-gl-js
 */
router.get('/styles', asyncHandler(async (req, res) => {
  console.log('test');
  const options = {
    url: 'https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    method: 'GET',
    timeout: 10 * 1000 // 10 seconds
  };
  const results = await requestAsPromise(options);
  const stylesheet = JSON.parse(results);
  /**
   * Notes:
   * Mapbox tileJSON schema reference: https://github.com/mapbox/tilejson-spec/tree/master/2.0.0*
   * This replace default enterprise carto tile service url with internal map tile proxy to hide carto tiles url
   * that can potentially have the Carto API KEY.
   * 'wmmap:' is custom a protocol that will be replaced with the correct domain by the map client
   *  eg. wmmap://vector-tiles -> https://causemos.uncharted.software/api/map/vector-tiles
   **/
  const tileJson = await requestAsPromise({ url: stylesheet.sources.carto.url, method: 'GET' });
  stylesheet.sources.carto = {
    ...JSON.parse(tileJson),
    type: 'vector'
  };
  stylesheet.sources.arcgisonline = {
    type: 'raster',
    tileSize: 256,
    tiles: ['wmmap://vector-tiles/{z}/{x}/{y}']
  };
  stylesheet.layers = [{
    id: 'simple-tiles',
    type: 'raster',
    source: 'arcgisonline',
    minzoom: 0,
    maxzoom: 22
  }];
  res.json(stylesheet);
}));

module.exports = router;
