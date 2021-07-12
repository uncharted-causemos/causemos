const { lte } = require('lodash');
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
const _setIndicatorProperties = async (parameter) => {
  if (_.isNil(parameter.indicator_id)) throw new Error('No indicator_id specified in parameter object');
  const indicatorMatch = await getIndicatorData(parameter.indicator_id, parameter.indicator_feature);
  if (_.isEmpty(indicatorMatch)) {
    return null;
  }

  const countryLevelData = indicatorMatch[0];
  const admin1LevelData = countryLevelData.children[0];
  const admin2LevelData = admin1LevelData.children[0];
  const indicatorTimeSeries = admin2LevelData.meta.timeseries.map(d => {
    return { value: d.value, timestamp: d.timestamp };
  });

  parameter.indicator_time_series = indicatorTimeSeries;
  parameter.indicator_time_series_parameter = {
    // obsolete now
    // unit: unit,
    country: countryLevelData.key,
    admin1: admin1LevelData.key,
    admin2: admin2LevelData.key
  };
};

/**
 * @param {string} variable - indicator name
 * @param {string} model - dataset/model name
 *
 * Returns an array of indicator data points for the specified indicator
 */
const getIndicatorData = async (variable, feature) => {
  Logger.info(`Get indicator data from wm-go:  ${variable}`);

  const options = {
    method: 'GET',
    url: process.env.WM_GO_URL +
      // Get data for all units
      `/maas/output/raw-data?model_id=${encodeURI(variable)}&run_id=${encodeURI('indicator')}&feature=${encodeURI(feature)}`
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

  return AggregationsUtil.groupDataArray(rawResult, _.cloneDeep(pipeline));
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
      let words = comp.split('/').slice(2);
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


  console.log('ontology candidates');
  console.log(ontologyCandidates);


  // Set default candidates
  const conceptMatches = {};
  const matchedKeys = Object.keys(ontologyCandidates);
  matchedKeys.forEach(conceptKey => {
    const topMatch = ontologyCandidates[conceptKey];
    conceptMatches[conceptKey] = {
      modified_at: editTime,
      parameter: {
        indicator_id: topMatch.data_id,
        indicator_name: topMatch.name + '/' + topMatch.outputs[0].display_name,
        indicator_source: topMatch.maintainer.organization,
        indicator_feature: topMatch.default_feature,
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
    try {
      await _setIndicatorProperties(matched.parameter);
      delete matched.parameter.indicator_feature;
    } catch {
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
