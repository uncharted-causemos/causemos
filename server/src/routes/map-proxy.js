const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const request = require('request');
const requestAsPromise = rootRequire('/util/request-as-promise');

const Logger = rootRequire('/config/logger');
const baseMapStyle = rootRequire('/basemap-style.json');

/* Keycloak Authentication */
const keycloak = rootRequire('/config/keycloak-config.js').getKeycloak();
const { PERMISSIONS } = rootRequire('/util/auth-util.js');

const CARTO_API_KEY = process.env.CARTO_MAP_API_KEY;
const API_KEY_PARAM = CARTO_API_KEY ? `?api_key=${CARTO_API_KEY}` : '';

/**
 * Proxy map raster tile requests for leaflet map.
 * Leaflet map cannot handle vector tile maps without extension
 */
router.get('/tiles', keycloak.enforcer([PERMISSIONS.USER]), (req, res) => {
  const { s, x, y, z } = req.query;

  // Enterprise and Public Domains for CARTO MAPS
  const enterpriseDomain = `https://enterprise-${s}.basemaps.cartocdn.com`;
  const publicDomain = `https://cartodb-basemaps-${s}.global.ssl.fastly.net`;

  const domain = CARTO_API_KEY ? enterpriseDomain : publicDomain;

  // Construct the URL based on the presence of an ENTERPRISE API KEY
  const url = `${domain}/rastertiles/light_all/${z}/${x}/${y}.png${API_KEY_PARAM}`;
  request
    .get(url, (error) => {
      if (error && error.code) {
        Logger.info('Error ' + error.code);
        res.statusCode = 500;
        res.json({ error: error });
      }
    })
    .pipe(res);
});

const getBaseTiles = async (res, url) => {
  request
    .get(url, (error) => {
      if (error && error.code) {
        Logger.info('Error ' + error.code);
        res.statusCode = 500;
        res.json({ error: error });
      }
    })
    .pipe(res)
    .on('end', () => {
      res.removeHeader('expires');
      res.removeHeader('pragma');
      res.set('Cache-control', 'public, max-age=86400');
    });

  // request.get(url, (error) => {
  //   if (error && error.code) {
  //     Logger.info('Error ' + error.code);
  //     res.statusCode = 500;
  //     res.json({ error: error });
  //   }
  // }).pipe(res);
};

/**
 * Proxy map vector tile requests for mapbox-gl-js
 * Use Carto API Key if provided
 */
router.get('/vector-tiles/:z/:x/:y', keycloak.enforcer([PERMISSIONS.USER]), (req, res) => {
  const { x, y, z } = req.params;
  const url = `https://tiles.basemaps.cartocdn.com/vectortiles/carto.streets/v1/${z}/${x}/${y}.mvt${API_KEY_PARAM}`;
  return getBaseTiles(res, url);
});

/**
 * Proxy map raster tile requests for mapbox-gl-js
 * Use Carto API Key if provided
 */
router.get('/satellite-tiles/:z/:x/:y', keycloak.enforcer([PERMISSIONS.USER]), (req, res) => {
  const { x, y, z } = req.params;
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}.png`;
  return getBaseTiles(res, url);
});

/**
 * Retrieve enterprise carto stylesheet for mapbox-gl-js
 */
router.get(
  '/styles/default',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    const stylesheet = JSON.parse(JSON.stringify(baseMapStyle)); // Deep clone json file to prevent from mutation
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
      type: 'vector',
      tiles: ['wmmap://vector-tiles/{z}/{x}/{y}'],
    };

    res.removeHeader('expires');
    res.removeHeader('pragma');
    res.set('Cache-control', 'max-age=86400');
    res.json(stylesheet);
  })
);

/**
 * Retrieve enterprise carto stylesheet for mapbox-gl-js
 */
router.get(
  '/styles/satellite',
  keycloak.enforcer([PERMISSIONS.USER]),
  asyncHandler(async (req, res) => {
    res.json({
      version: 8,
      sources: {
        'satellite-tiles': {
          type: 'raster',
          tiles: ['wmmap://satellite-tiles/{z}/{x}/{y}'],
          tileSize: 256,
          attribution:
            'Map tiles by <a target="_top" rel="noopener" href="http://stamen.com">Stamen Design</a>, under <a target="_top" rel="noopener" href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a target="_top" rel="noopener" href="http://openstreetmap.org">OpenStreetMap</a>, under <a target="_top" rel="noopener" href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>',
        },
      },
      layers: [
        {
          id: 'simple-tiles',
          type: 'raster',
          source: 'satellite-tiles',
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    });
  })
);

module.exports = router;
