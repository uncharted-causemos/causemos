const _ = require('lodash');
const { Client } = require('@elastic/elasticsearch');

const Logger = rootRequire('/config/logger');
const elasticUtil = rootRequire('/util/elastic-util');
// Use an LRU cache for map requests.
const cache = rootRequire('/cache/node-lru-cache');

// Elastic search client
const client = new Client({ node: `${process.env.BU_DATA_URL}` });

/**
 * Get model output time series
 */
const getModelOutputTimeseries = async ({
  model,
  runId,
  feature,
  zoom = 8
}) => {
  const filter = elasticUtil.createFilter({
    model: model.toLowerCase(),
    runId,
    feature,
    zoom
  });

  // FIXME: Output timeseries does not take spatial or temporal aggregation
  //        into account. We are aggregating all models by avg.
  const payload = {
    index: 'model_timeseries',
    size: 10000,
    body: {
      query: {
        bool: {
          filter
        }
      }
    }
  };

  const key = JSON.stringify(payload);
  if (cache.has(key)) {
    Logger.info('Cached result found for timeseries');
    return cache.get(key);
  }

  try {
    const response = await client.search(payload);
    let timeseries = [];
    response.body.hits.hits.forEach(hit => {
      timeseries.push({
        timestamp: hit._source.timestamp,
        value: hit._source.avg_bin_avg
      });
    });
    timeseries = _.sortBy(timeseries, d => d.timestamp);
    const result = { timeseries };
    cache.set(key, result);
    return result;
  } catch (err) {
    Logger.info(JSON.stringify(err));
    return err;
  }
};

/**
 * Get model output stats
 */
const getModelOutputStats = async ({
  model,
  runId,
  feature,
  zoom = 8,
  interval,
  spatialAggFn
}) => {
  const filter = elasticUtil.createFilter({
    model: model.toLowerCase(),
    runId,
    feature,
    zoom
  });

  // FIXME: Output stats does not take spatial or temporal aggregation
  //        into account. We are aggregating all models by avg.
  // interval = interval || 'month';
  // spatialAggFn = _.get(AGG_FN_MAPPING_TO_ES, spatialAggFn, 'avg');
  const payload = {
    index: 'model_output_stats',
    size: 1,
    body: {
      query: {
        bool: {
          filter
        }
      }
    }
  };

  const key = JSON.stringify(payload);
  if (cache.has(key)) {
    Logger.info('Cached result found for output stats');
    return cache.get(key);
  }

  try {
    const response = await client.search(payload);
    const stats = {
      min: response.body.hits.hits[0]._source.min_avg,
      max: response.body.hits.hits[0]._source.max_avg
    };
    cache.set(key, stats);
    return stats;
  } catch (err) {
    Logger.info(JSON.stringify(err));
    return err;
  }
};

module.exports = {
  getModelOutputTimeseries,
  getModelOutputStats
};
