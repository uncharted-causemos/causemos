const _ = require('lodash');
const moment = require('moment');
const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');

const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');
const AggregationsUtil = rootRequire('/util/aggregations-util');

const DEFAULT_SIZE = 10000;

/**
 * @param {object} parameter - parameter
 * @param {string} parameter.indicator_id - indicator variable
 * @param {string} parameter.indicator_source - dataset/model
 *
 * Extend the object passed in with the time series data and other associated data
 * for the given indicator_name
 */
const _setIndicatorProperties = async(parameter) => {
  if (_.isNil(parameter.indicator_id)) throw new Error('No indicator_id specified in parameter object');
  const indicatorMatch = await getIndicatorData(parameter.indicator_id, parameter.indicator_source);
  if (_.isEmpty(indicatorMatch)) {
    return null;
  }

  // FIXME: more intelligent defaults
  const unit = Object.keys(indicatorMatch)[0];
  const countryLevelData = indicatorMatch[unit][0];
  const admin1LevelData = countryLevelData.children[0];
  const admin2LevelData = admin1LevelData.children[0];
  const indicatorTimeSeries = admin2LevelData.meta.timeseries.map(d => {
    return { value: d.value, timestamp: d.timestamp };
  });

  parameter.indicator_time_series = indicatorTimeSeries;
  parameter.indicator_time_series_parameter = {
    unit: unit,
    country: countryLevelData.key,
    admin1: admin1LevelData.key,
    admin2: admin2LevelData.key
  };
};


/**
 * @param {array} concepts - list of concept names
 *
 * Returns a list of pre-matched indicators
 */
const conceptSearch = async (concepts) => {
  Logger.info(`Searching for indicators by concept using wm-go:  ${JSON.stringify(concepts)}`);

  const filters = {
    clauses: [
      {
        field: 'concepts.name',
        operand: 'or',
        isNot: false,
        values: concepts
      },
      {
        field: 'type',
        operand: 'or',
        isNot: false,
        values: ['indicator']
      }
    ]
  };

  const options = {
    method: 'GET',
    url: process.env.WM_GO_URL + `/maas/datacubes?filters=${encodeURI(JSON.stringify(filters))}`
  };

  const response = await requestAsPromise(options);
  const rawResult = JSON.parse(response);

  const result = {};
  concepts.forEach(concept => {
    const bestIndicator =
      _(rawResult.map(indicator => {
        // Find the indicator with the highest 'score' value for this concept
        const foundConcept = _.find(indicator.concepts, con => con.name === concept);
        const score = foundConcept === undefined ? 0 : foundConcept.score;
        return {
          ...indicator,
          _match_score: score
        };
      })).sortBy('_match_score').last();

    if (bestIndicator && bestIndicator._match_score > 0) {
      result[concept] = bestIndicator;
    }
  });

  return result;
};


/**
 * @param {string} variable - indicator name
 * @param {string} model - dataset/model name
 *
 * Returns an array of indicator data points for the specified indicator
 */
const getIndicatorData = async (variable, model) => {
  Logger.info(`Get indicator data from wm-go:  ${variable}`);

  const options = {
    method: 'GET',
    url: process.env.WM_GO_URL +
      // Get data for all units
      `/maas/indicator-data?indicator=${encodeURI(variable)}&model=${encodeURI(model)}`
  };

  const response = await requestAsPromise(options);
  const rawResult = JSON.parse(response);

  const pipeline = [
    {
      keyFn: (d) => d.country,
      metaFn: (c) => {
        return { timeseries: c.dataArray };
      }
    },
    {
      keyFn: (d) => d.admin1,
      metaFn: (c) => {
        return { timeseries: c.dataArray };
      }
    },
    {
      keyFn: (d) => d.admin2,
      metaFn: (c) => {
        return { timeseries: c.dataArray };
      }
    }
  ];

  const result = {};
  const groupedByUnit = _.groupBy(rawResult, d => d.value_unit);
  Object.keys(groupedByUnit).forEach(unitKey => {
    result[unitKey] = AggregationsUtil.groupDataArray(groupedByUnit[unitKey], _.cloneDeep(pipeline));
  });
  return result;
};

/**
 * Find all node parameters (concepts) without indicators
 * @param {string} modelId - model id
 *
 */
const _findAllWithoutIndicators = async (modelId) => {
  const nodeParameterAdapter = Adapter.get(RESOURCE.NODE_PARAMETER);
  const esClient = nodeParameterAdapter.client;
  const query = {
    bool: {
      filter: {
        term: {
          model_id: modelId
        }
      },
      must_not: {
        exists: {
          field: 'parameter.indicator_name'
        }
      }
    }
  };
  const searchPayload = {
    index: RESOURCE.NODE_PARAMETER,
    size: DEFAULT_SIZE,
    body: { query }
  };

  const response = await esClient.search(searchPayload);
  if (response.errors) {
    throw new Error(JSON.stringify(response.items[0]));
  }
  return response.body.hits.hits.map(d => d._source);
};

/**
 * Attempt to set or reset default indicators for concepts
 * @param {string} modelId - model id
 */
const setDefaultIndicators = async (modelId) => {
  Logger.info(`Setting default indicators for: ${modelId}`);
  const nodeParameters = await _findAllWithoutIndicators(modelId);
  // Remove node parameters without concepts
  const filteredNodeParameters = nodeParameters.filter(n => !_.isNil(n.concept));

  const concepts = filteredNodeParameters.map(n => n.concept);
  const conceptCandidates = await conceptSearch(concepts);

  // All of these indicators are set by the same action, so they should
  // all have the same modified_at time
  const editTime = moment.valueOf();

  // Set default candidates
  const conceptMatches = {};
  const matchedKeys = Object.keys(conceptCandidates);
  matchedKeys.forEach(conceptKey => {
    const topMatch = conceptCandidates[conceptKey];
    conceptMatches[conceptKey] = {
      modified_at: editTime,
      parameter: {
        indicator_id: topMatch.variable,
        indicator_name: topMatch.output_name,
        indicator_source: topMatch.model,
        indicator_score: topMatch._match_score
        // Added in _setIndicatorProperties below
        // indicator_time_series,
        // indicator_time_series_parameter: {
        //   unit,
        //   country,
        //   admin1,
        //   admin2
        // }
      }
    };
  });

  // Enrich conceptMatches
  for (const conceptKey of matchedKeys) {
    const matched = conceptMatches[conceptKey];
    await _setIndicatorProperties(matched.parameter);
  }

  // Go through concept without indicator association and set default
  let patchedCount = 0;
  filteredNodeParameters.forEach(n => {
    const concept = n.concept;
    if (_.isEmpty(conceptMatches[concept])) {
      conceptMatches[concept] = {
        modified_at: editTime,
        parameter: null
      };
      patchedCount += 1;
    }

    // Set id for ES update
    conceptMatches[concept].id = n.id;
  });
  Logger.info('Patched unmatched concepts ' + patchedCount);

  if (_.isEmpty(conceptMatches)) return;
  // Write back to database
  const keyFn = (doc) => {
    return doc.id;
  };
  const nodeParameterAdapter = Adapter.get(RESOURCE.NODE_PARAMETER);
  const result = await nodeParameterAdapter.update(Object.values(conceptMatches), keyFn);
  if (result.errors) {
    throw new Error(JSON.stringify(result.items[0]));
  }
  return result;
};

module.exports = {
  setDefaultIndicators
};
