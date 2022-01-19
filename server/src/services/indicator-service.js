const _ = require('lodash');
const Logger = rootRequire('/config/logger');
const requestAsPromise = rootRequire('/util/request-as-promise');
const modelUtil = rootRequire('/util/model-util');
const searchService = rootRequire('/services/search-service');

const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');

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
    size: SEARCH_LIMIT,
    body: { query }
  };

  const response = await esClient.search(searchPayload);
  if (response.errors) {
    throw new Error(JSON.stringify(response.items[0]));
  }
  return response.body.hits.hits.map(d => d._source);
};

// Returns top concept->datacube mappings
const getConceptIndicatorMap = async (model, nodeParameters) => {
  const historyAdapter = Adapter.get(RESOURCE.INDICATOR_MATCH_HISTORY);
  const datacubeAdapter = Adapter.get(RESOURCE.DATA_DATACUBE);
  const nodesNotInHistory = [];
  const result = new Map();

  // 1. Check against historical matches
  for (const node of nodeParameters) {
    // 1.1 Check project specific history first
    let topUsedIndicator = await historyAdapter.findOne([
      { field: 'project_id', value: model.project_id },
      { field: 'concept', value: node.concept }
    ], { sort: [{ frequency: { order: 'desc' } }] });

    if (!_.isNil(topUsedIndicator)) {
      Logger.info(`Using previous selection (project specific) ${node.concept} => ${topUsedIndicator.indicator_id}`);
      const cube = await datacubeAdapter.findOne({
        clauses: [
          {
            field: 'id',
            values: [topUsedIndicator.indicator_id]
          }
        ]
      }, {});
      if (cube) {
        result.set(node.concept, cube);
      }
      continue;
    }

    // 1.2 If project specific history doesn't exist, fall back to global history
    topUsedIndicator = await historyAdapter.findOne([
      { field: 'concept', value: node.concept }
    ], { sort: [{ frequency: { order: 'desc' } }] });

    if (!_.isNil(topUsedIndicator)) {
      Logger.info(`Using previous selection (not project specific) ${node.concept} => ${topUsedIndicator.indicator_id}`);
      const cube = await datacubeAdapter.findOne({
        clauses: [
          {
            field: 'id',
            values: [topUsedIndicator.indicator_id]
          }
        ]
      }, {});
      if (cube) {
        result.set(node.concept, cube);
      }
      continue;
    }

    // 1.3 Otherwise, flag the node
    nodesNotInHistory.push(node);
  }


  // 2. Run search against datacubes
  for (const node of nodesNotInHistory) {
    const concepts = node.components;
    const candidates = await searchService.indicatorSearchByConcepts(model.project_id, concepts);
    if (!_.isEmpty(candidates)) {
      result.set(node.concept, candidates[0]);
    }
  }
  return result;
};

const ABSTRACT_INDICATOR = {
  id: null,
  name: 'Abstract',
  unit: '',
  country: '',
  admin1: '',
  admin2: '',
  admin3: '',
  spatialAggregation: 'mean',
  temporalAggregation: 'mean',
  temporalResolution: 'month',
  period: 1,
  timeseries: [
    { value: 0.5, timestamp: Date.UTC(2017, 0) },
    { value: 0.5, timestamp: Date.UTC(2017, 1) },
    { value: 0.5, timestamp: Date.UTC(2017, 2) }
  ],
  min: 0,
  max: 1
};

/**
 * Attempt to set or reset default indicators for concepts
 * @param {string} modelId - model id
 * @param {string} resolution - one of {month, year}
 */
const setDefaultIndicators = async (modelId, resolution) => {
  Logger.info(`Setting default indicators for: ${modelId}`);
  const modelAdapter = Adapter.get(RESOURCE.MODEL);
  const model = await modelAdapter.findOne([{ field: 'id', value: modelId }], {});
  const nodeParameters = await _findAllWithoutIndicators(modelId);
  const conceptIndicatorMap = await getConceptIndicatorMap(model, nodeParameters);

  // Defaults
  const geospatialAgg = 'mean';
  const temporalAgg = 'mean';

  const updates = [];

  for (const node of nodeParameters) {
    const updatePayload = {
      id: node.id
    };
    if (conceptIndicatorMap.has(node.concept)) {
      const cube = conceptIndicatorMap.get(node.concept);
      updatePayload.parameter = {
        id: cube.id,
        name: cube.outputs[0].display_name,
        unit: cube.outputs[0].unit,
        country: '',
        admin1: '',
        admin2: '',
        admin3: '',
        spatialAggregation: geospatialAgg,
        temporalAggregation: temporalAgg,
        temporalResolution: resolution,
        period: 12
      };

      // Set time series, min, max
      try {
        const feature = cube.default_feature;
        const dataId = cube.data_id;
        const parameter = updatePayload.parameter;

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
      } catch (err) {
        Logger.warn(err);
        Logger.warn(`Failed getting data, reset ${node.concept} to abstract`);
        updatePayload.parameter = _.cloneDeep(ABSTRACT_INDICATOR);
      }
    } else {
      updatePayload.parameter = _.cloneDeep(ABSTRACT_INDICATOR);
    }
    updates.push(updatePayload);
  }

  if (!_.isEmpty(updates)) {
    Logger.info(`Updating ${updates.length} node-parameters`);
    const keyFn = (doc) => { return doc.id; };
    const nodeParameterAdapter = Adapter.get(RESOURCE.NODE_PARAMETER);
    const result = await nodeParameterAdapter.update(updates, keyFn);
    if (result.errors) {
      throw new Error(JSON.stringify(result.items[0]));
    }
  }
};

module.exports = {
  setDefaultIndicators
};
