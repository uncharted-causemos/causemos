const _ = require('lodash');
const moment = require('moment');
const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');
const modelUtil = rootRequire('/util/model-util');

const { Adapter, RESOURCE } = rootRequire('/adapters/es/adapter');

const DEFAULT_SIZE = 10000;

const getIndicatorData = async (dataId, feature, temporalResolution, temporalAggregation, geospatialAggregation) => {
  Logger.info(`Get indicator data from wm-go: ${dataId} ${feature}`);

  const options = {
    method: 'GET',
    url: process.env.WM_GO_URL +
      `/maas/output/timeseries?data_id=${encodeURI(dataId)}&run_id=indicator&feature=${encodeURI(feature)}&resolution=${temporalResolution}&temporal_agg=${temporalAggregation}&spatial_agg=${geospatialAggregation}`,
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: {}
  };
  const response = await requestAsPromise(options);
  return response;
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
          // field: 'parameter.id'
          field: 'parameter.name'
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
  const geospatialAgg = 'mean';
  const temporalAgg = 'mean';
  const resolution = 'month';

  for (const conceptKey of matchedKeys) {
    const topMatch = ontologyCandidates[conceptKey];

    // Medata and default configuration
    conceptMatches[conceptKey] = {
      modified_at: editTime,
      parameter: {
        id: topMatch.id,
        name: topMatch.outputs[0].display_name,
        unit: topMatch.outputs[0].unit,
        country: '',
        admin1: '',
        admin2: '',
        admin3: '',
        geospatial_aggregation: geospatialAgg,
        temporal_aggregation: temporalAgg,
        temporal_resolution: resolution,
        period: 12
      }
    };

    // Time series, min, max
    const feature = topMatch.default_feature;
    const dataId = topMatch.data_id;
    const parameter = conceptMatches[conceptKey].parameter;

    const timeseries = await getIndicatorData(dataId, feature, resolution, temporalAgg, geospatialAgg);
    if (_.isEmpty(timeseries)) {
      parameter.timeseries = [];
      parameter.min = 0;
      parameter.max = 1;
    } else {
      parameter.timeseries = timeseries;
      const values = timeseries.map(d => d.value);
      const { max, min } = modelUtil.projectionValueRange(values);
      parameter.min = min;
      parameter.max = max;
    }
  }

  // Go through concept without indicator association and set default abstract indicators
  let patchedCount = 0;
  filteredNodeParameters.forEach(node => {
    const concept = node.concept;
    if (_.isEmpty(conceptMatches[concept])) {
      conceptMatches[concept] = {
        modified_at: editTime,
        parameter: {
          id: null,
          name: 'Abstract',
          unit: '',
          country: '',
          admin1: '',
          admin2: '',
          admin3: '',
          geospatial_aggregation: 'mean',
          temporal_aggregation: 'mean',
          temporal_resolution: 'month',
          period: 12,
          timeseries: [
            { value: 0.5, timestamp: Date.UTC(2017, 0) },
            { value: 0.5, timestamp: Date.UTC(2017, 1) },
            { value: 0.5, timestamp: Date.UTC(2017, 2) }
          ],
          min: 0,
          max: 1
        }
      };
      patchedCount += 1;
    }

    // Set id for ES update
    conceptMatches[concept].id = node.id;
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
