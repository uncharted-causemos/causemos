const _ = require('lodash');
const Logger = rootRequire('/config/logger');
const modelUtil = rootRequire('/util/model-util');
const searchService = rootRequire('/services/search-service');
const { getTimeseries } = rootRequire('/services/datacube-service');
const { correctIncompleteTimeseries } = rootRequire('/util/incomplete-data-detection');
const { client } = rootRequire('/adapters/es/client');
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');


const _buildQueryStringFilter = (text) => {
  let cleanedStr = _.last(text.split('/'));
  cleanedStr = cleanedStr.replaceAll('_', ' ');
  cleanedStr = cleanedStr
    .replace(/[^\w\s]/gi, '')
    .replace(/\s\s+/gi, ' ')
    .trim();

  const labels = cleanedStr.split(' ');

  let query = '';
  if (labels.length === 1) {
    query = labels[0];
  } else {
    query = '(' + labels[0] + ') AND (' + labels[1] + ')';
  }
  return {
    query_string: {
      query: query,
      fields: ['name', 'family_name', 'description', 'category', 'outputs.name', 'outputs.display_name', 'outputs.description', 'tags', 'geography.*', 'ontology_matches', 'data_info']
    }
  };
};

const textSearch = async (text) => {
  const searchPayload = {
    index: RESOURCE.DATA_DATACUBE,
    size: 10,
    body: {
      query: {
        bool: {
          must: [
            _buildQueryStringFilter(text),
            { match: { type: 'indicator' } },
            { match: { status: 'READY' } }
          ]
        }
      },
      sort: [
        { _score: 'desc' }
      ]
    }
  };
  const results = await client.search(searchPayload);
  return results.body.hits.hits.map(d => d._source);
};

const getDefaultModelRun = async (dataId) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  const defaultRun = await connection.findOne([
    { field: 'model_id', value: dataId },
    { field: 'status', value: 'READY' },
    { field: 'is_default_run', value: true }
  ], {});
  return defaultRun;
};

/**
 * Find all node parameters (concepts) without indicators
 * @param {string} modelId - model id
 */
const _findUnquantifiedNodes = async (modelId) => {
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
  const result = new Map();

  // 1. Check against historical matches
  for (const node of nodeParameters) {
    // 1.1 Check project specific history first
    let topUsedIndicator = await historyAdapter.findOne(
      [
        { field: 'project_id', value: model.project_id },
        { field: 'concept', value: node.concept }
      ],
      {
        sort: [
          { frequency: { order: 'desc' } },
          { modified_at: { order: 'desc' } }
        ]
      }
    );

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
        result.set(node.concept, [cube]);
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
        result.set(node.concept, [cube]);
      }
      continue;
    }
  }

  const numMatches = 3;

  // 2. Check against concept aligner matches
  // Note: this assumes that order of results returned by the searchService is the same as nodes provided
  const geography = model.parameter.geography;
  const indicators = await searchService.indicatorSearchConceptAlignerBulk(model.project_id, nodeParameters, numMatches, geography);

  for (let i = 0; i < indicators.length; i++) {
    if (indicators[i].length === 0) {
      continue;
    }
    Logger.info(`Found ${indicators[i].length} candidates for node ${nodeParameters[i].concept}`);
    const key = nodeParameters[i].concept;
    if (result.has(key)) {
      const temp = result.get(key);
      result.set(key, [...temp, ...indicators[i]]);
    } else {
      result.set(key, indicators[i]);
    }
  }

  // 3. Run search against datacubes
  for (const node of nodeParameters) {
    if (result.has(node.concept)) {
      continue;
    }
    const candidates = await textSearch(node.label);
    if (!_.isEmpty(candidates)) {
      result.set(node.concept, [candidates[0]]);
    }
  }
  return result;
};

/**
 * @param {string} resolution - one of { month, year }
 */
const abstractIndicator = (resolution) => {
  const base = {
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

  if (resolution === 'year') {
    base.temporalResolution = resolution;
    base.timeseries = [
      { value: 0.5, timestamp: Date.UTC(2017, 0) },
      { value: 0.5, timestamp: Date.UTC(2018, 0) },
      { value: 0.5, timestamp: Date.UTC(2019, 0) }
    ];
  }
  return base;
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
  const nodeParameters = await _findUnquantifiedNodes(modelId);
  const country = model.parameter.geography;

  const conceptIndicatorMap = await getConceptIndicatorMap(model, nodeParameters);

  const updates = [];

  for (const node of nodeParameters) {
    // Defaults
    let spatialAggregation = 'mean';
    let temporalAggregation = 'mean';

    const matches = conceptIndicatorMap.get(node.concept);
    const updatePayload = {
      id: node.id
    };
    if (conceptIndicatorMap.has(node.concept)) {
      const cube = matches[0];

      // Use proper aggregation functions if they're set
      if (cube.default_view) {
        if (cube.default_view.spatialAggregation) {
          spatialAggregation = cube.default_view.spatialAggregation;
        }
        if (cube.default_view.temporalAggregation) {
          temporalAggregation = cube.default_view.temporalAggregation;
        }
      }

      const defaultFeature = cube.outputs.find(output => output.name === cube.default_feature);

      let runId = 'indicator';
      if (cube.type === 'model') {
        // If the datacube is a model, we need to find the runId of the default run
        const run = await getDefaultModelRun(cube.data_id);
        runId = run?.id ?? 'no-default-run';
      }

      updatePayload.match_candidates = matches.map(match => {
        const output = match.outputs.find(output => output.name === match.default_feature);
        return { id: match.id, dataId: match.data_id, displayName: output.display_name || output.name };
      });
      updatePayload.parameter = {
        id: cube.id,
        data_id: cube.data_id,
        runId,
        name: defaultFeature.display_name || defaultFeature.name,
        unit: defaultFeature.unit,
        country: country,
        admin1: '',
        admin2: '',
        admin3: '',
        spatialAggregation,
        temporalAggregation,
        temporalResolution: resolution,
        period: resolution === 'month' ? 12 : 1
      };

      // Set time series, min, max
      try {
        const feature = cube.default_feature;
        const dataId = cube.data_id;
        const parameter = updatePayload.parameter;

        const timeseries = await getTimeseries(dataId, runId, feature, resolution, temporalAggregation, spatialAggregation, country);
        if (_.isEmpty(timeseries)) {
          Logger.warn(`Data ${feature} is empty, reset ${node.concept} to abstract`);
          updatePayload.parameter = abstractIndicator(resolution);
        } else {
          const rawResolution = defaultFeature.data_resolution?.temporal_resolution ?? 'other';
          const finalRawDate = new Date(cube.period?.lte ?? 0);
          const points = correctIncompleteTimeseries(timeseries, rawResolution, resolution, temporalAggregation, finalRawDate);
          parameter.timeseries = points;
          const values = timeseries.map(d => d.value);
          const { max, min } = modelUtil.projectionValueRange(values);
          parameter.min = min;
          parameter.max = max;
        }
      } catch (err) {
        Logger.warn(err);
        Logger.warn(`Failed getting data, reset ${node.concept} to abstract`);
        updatePayload.parameter = abstractIndicator(resolution);
      }
    } else {
      updatePayload.parameter = abstractIndicator(resolution);
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
