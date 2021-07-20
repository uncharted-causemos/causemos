const _ = require('lodash');
const moment = require('moment');
const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');

const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');

const DEFAULT_SIZE = 10000;

/**
 * @param {object} parameter - parameter
 * @param {string} parameter.indicator_id - indicator variable
 * @param {string} parameter.indicator_source - dataset/model
 *
 * Extend the object passed in with the time series data and other associated data
 * for the given indicator_name
 */
const _setIndicatorProperties = async (parameter) => {
  if (_.isNil(parameter.data_id)) throw new Error('No indicator_id specified in parameter object');
  const indicatorData = await getIndicatorData(parameter);
  if (_.isEmpty(indicatorData)) {
    return null;
  }
  parameter.timeseries = indicatorData;
};

/**
 * @param {string} variable - indicator name
 * @param {string} model - dataset/model name
 *
 * Returns an array of indicator data points for the specified indicator
 */
const getIndicatorData = async (parameter) => {
  Logger.info(`Get indicator data from wm-go:  ${parameter.data_id}`);

  const options = {
    method: 'GET',
    url: process.env.WM_GO_URL +
      // Get data for all units
      `/maas/output/timeseries?data_id=${encodeURI(parameter.data_id)}&run_id=indicator&feature=${encodeURI(parameter.indicator_feature)}&resolution=${encodeURI(parameter.temporal_resolution)}&temporal_agg=${encodeURI(parameter.temporal_aggregation)}&spatial_agg=${encodeURI(parameter.geospatial_aggregation)}`
  };

  const response = await requestAsPromise(options);
  const rawResult = JSON.parse(response);

  return rawResult;
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

const getOntologyCandidates = async (modelId, concepts) => {
  const ontologyCandidates = {};

  const indicatorMetadataAdapter = Adapter.get(RESOURCE.DATA_DATACUBE);
  const esClient = indicatorMetadataAdapter.client;

  const modelAdapter = Adapter.get(RESOURCE.MODEL);
  const modelData = await modelAdapter.findOne([{ field: 'id', value: modelId }], {});

  for (const concept of concepts) {
    let compositionalConcepts = [];
    const projectDataAdapter = Adapter.get(RESOURCE.STATEMENT, modelData.project_id);
    const query = {
      bool: {
        should: [
          {
            term: {
              'subj.concept': concept
            }
          },
          {
            term: {
              'obj.concept': concept
            }
          }
        ]
      }
    };
    const projectData = await projectDataAdapter.client.search({
      index: projectDataAdapter.index,
      body: {
        size: 1, query
      }
    });
    const results = projectData.body.hits.hits;
    if (_.isEmpty(results)) {
      compositionalConcepts = [concept];
    } else {
      results.forEach(r => {
        const source = r._source;
        if (source.subj.concept === concept) {
          compositionalConcepts = [
            source.subj.theme,
            source.subj.theme_property,
            source.subj.process,
            source.subj.process_property
          ].filter(d => d !== '');
        } else {
          compositionalConcepts = [
            source.obj.theme,
            source.obj.theme_property,
            source.obj.process,
            source.obj.process_property
          ].filter(d => d !== '');
        }
      });
    }
    // make sure array contains unique values
    compositionalConcepts = [...new Set(compositionalConcepts)];

    const compositionalKeywords = [...new Set(compositionalConcepts.map(comp => {
      const words = comp.split('/').slice(2);
      return words.map(word => word.split('_')).flat(1);
    }).flat(1))];

    const searchPayload = {
      index: RESOURCE.DATA_DATACUBE,
      size: DEFAULT_SIZE,
      body: {
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    {
                      nested: {
                        path: 'ontology_matches',
                        query: {
                          terms: {
                            'ontology_matches.name': compositionalConcepts
                          }
                        }
                      }
                    },
                    {
                      terms: {
                        description: compositionalKeywords
                      }
                    },
                    {
                      terms: {
                        'outputs.description': compositionalKeywords
                      }
                    }
                  ]
                }
              },
              {
                match: {
                  type: 'indicator'
                }
              }
            ]
          }
        },
        sort: [
          {
            _score: {
              order: 'desc'
            }
          }
        ]
      }
    };
    const response = await esClient.search(searchPayload);
    const foundIndicatorMetadata = response.body.hits.hits;

    if (!_.isEmpty(foundIndicatorMetadata)) {
      ontologyCandidates[concept] = {
        ...foundIndicatorMetadata[0]._source,
        _match_score: foundIndicatorMetadata[0]._score
      };
    }
  }
  return ontologyCandidates;
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
  const ontologyCandidates = await getOntologyCandidates(modelId, concepts);

  // All of these indicators are set by the same action, so they should
  // all have the same modified_at time
  const editTime = moment.valueOf();


  // Set default candidates
  const conceptMatches = {};
  const matchedKeys = Object.keys(ontologyCandidates);
  // params that will be hard coded for the time being
  const spatial = 'mean';
  const temporalAgg = 'mean';
  const resolution = 'month';
  matchedKeys.forEach(conceptKey => {
    const topMatch = ontologyCandidates[conceptKey];
    conceptMatches[conceptKey] = {
      modified_at: editTime,
      parameter: {
        indicator_feature: topMatch.default_feature,
        id: topMatch.id,
        data_id: topMatch.data_id,
        name: topMatch.name,
        unit: '',
        country: '',
        admin1: '',
        admin2: '',
        admin3: '',
        geospatial_aggregation: spatial,
        temporal_aggregation: temporalAgg,
        temporal_resolution: resolution
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
    try {
      await _setIndicatorProperties(matched.parameter);
      delete matched.parameter.indicator_feature;
    } catch (err) {
      Logger.info(`Concept failed to match:  ${conceptKey}`);
      delete conceptMatches[conceptKey];
    }
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
