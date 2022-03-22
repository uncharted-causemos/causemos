const _ = require('lodash');
const { Adapter, RESOURCE, SEARCH_LIMIT } = rootRequire('/adapters/es/adapter');
const requestAsPromise = rootRequire('/util/request-as-promise');
const domainProjectService = rootRequire('/services/domain-project-service');
const { processFilteredData, removeUnwantedData } = rootRequire('util/post-processing-util.ts');
const { correctIncompleteTimeseries } = rootRequire('/util/incomplete-data-detection');
const Logger = rootRequire('/config/logger');

const auth = rootRequire('/util/auth-util');
const basicAuthToken = auth.getBasicAuthToken(process.env.DOJO_USERNAME, process.env.DOJO_PASSWORD);

const DOJO_ROOT_FIELDS = [
  'description',
  'category',
  'domains',
  'data_sensitivity',
  'data_quality',
  'tags'
];

const DOJO_PARAMETER_FIELDS = [
  'display_name',
  'description',
  'unit',
  'unit_description',
  'type',
  'data_type',
  'choices',
  'min',
  'max'
];

const DOJO_OUTPUT_FIELDS = [
  'display_name',
  'description',
  'unit',
  'unit_description'
];

/**
 * Return datacubes that match the provided filter
 */
const getDatacubes = async(filter, options) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  if (!options.size) {
    options.size = SEARCH_LIMIT;
  }
  if (!options.excludes) {
    options.excludes = [
      'outputs.ontologies',
      'qualifier_outputs.ontologies',
      'ontology_matches'
    ];
  }
  return await connection.find(filter, options);
};

/**
 * Return datacubes grouped by their data_id. This represents the concept of datasets.
 */
const getDatasets = async(type, limit) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  const searchLimit = limit > 0 && limit <= SEARCH_LIMIT ? limit : SEARCH_LIMIT;
  return await connection.searchDatasets(type, searchLimit);
};

/**
 * Return the total number of datacubes (models + indicators) that match the provided filter
 */
const countDatacubes = async (filter) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.count(filter);
};

/**
 * Insert a new datacube
 */
const insertDatacube = async(metadata) => {
  Logger.info(`Start insert datacube ${metadata.name} ${metadata.id}`);
  // TODO: Fix all this copypasta from maas-service startIndicatorPostProcessing

  // Allow deprecation of models while registering a new one. Field removed via `removeUnwantedData`
  const deprecatedIds = metadata.deprecatesIDs;
  metadata.type = metadata.type || 'model'; // Assume these are all models for now
  metadata.is_hidden = false;
  metadata.is_stochastic = metadata.is_stochastic || metadata.stochastic;
  processFilteredData(metadata);
  removeUnwantedData(metadata);

  metadata.data_id = metadata.id;
  metadata.status = 'REGISTERED';

  // Take the first numeric output, others are not currently supported
  const validOutput = metadata.outputs.filter(o =>
    o.type === 'int' || o.type === 'float' || o.type === 'boolean'
  )[0] || metadata.outputs[0];
  metadata.default_feature = validOutput.name;

  // Combine all concept matches into one list at the root
  const fields = [metadata.outputs, metadata.parameters];
  if (metadata.qualifier_outputs) {
    fields.push(metadata.qualifier_outputs);
  }

  const ontologyMatches = fields.map(field => {
    return field.filter(variable => variable.ontologies)
      .map(variable => [
        ...variable.ontologies.concepts,
        ...variable.ontologies.processes,
        ...variable.ontologies.properties
      ]);
  }).flat(2);

  metadata.ontology_matches = _.sortedUniqBy(_.orderBy(ontologyMatches, ['name', 'score'], ['desc', 'desc']), 'name');

  // Remove section specific ontologies
  fields.forEach(field => {
    field.forEach(variable => {
      variable.ontologies = undefined;
    });
  });

  // a new datacube (model or indicator) is being added
  // ensure for each newly registered datacube a corresponding domain project
  await domainProjectService.updateDomainProjects(metadata);

  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  try {
    const result = await connection.insert([metadata]);

    // Allow deprecation of models while registering a new one
    if (deprecatedIds) {
      await deprecateDatacubes(metadata.id, deprecatedIds);
    }
    return { result: { es_response: result }, code: 201 };
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }
};

/**
 * Update a datacube with the specified changes
 */
const updateDatacube = async(metadataDelta) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  await updateDojoMetadata([metadataDelta]);
  return await connection.update([metadataDelta]);
};

/**
 * Update datacubes with the specified changes
 */
const updateDatacubes = async(metadataDeltas, notifyDojo = true) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  if (notifyDojo) {
    await updateDojoMetadata(metadataDeltas);
  }
  return await connection.update(metadataDeltas, 'wait_for');
};

/**
 * Send any relevant updates to the metadata to Dojo
 *
 * NOTE: If Dojo ever sends updates to Causemos something will need to be added to prevent infinite loops.
 */
const updateDojoMetadata = async(metadataDeltas) => {
  const promises = metadataDeltas
    // Filter out datacubes we know are indicators
    .filter(delta => delta.type !== 'indicator' && (!delta.data_id || delta.data_id === delta.id))
    .map(delta => {
      const rootChanges = {};
      let maintainer = {};
      const parameters = {};
      const outputs = {};
      Object.keys(delta).forEach(field => {
        if (field === 'maintainer') {
          maintainer = delta.maintainer || {};
        } else if (field === 'parameters') {
          // create a param.name -> paramChanges map
          delta.parameters.forEach(param => {
            const paramChanges = {};
            Object.keys(param).forEach(paramField => {
              if (DOJO_PARAMETER_FIELDS.includes(paramField)) {
                paramChanges[paramField] = param[paramField];
              }
            });
            if (!_.isEmpty(paramChanges)) {
              parameters[param.name] = paramChanges;
            }
          });
        } else if (field === 'outputs') {
          // create an output.name -> outputChanges map
          delta.outputs.forEach(output => {
            const outputChanges = {};
            Object.keys(output).forEach(outputField => {
              if (DOJO_OUTPUT_FIELDS.includes(outputField)) {
                outputChanges[outputField] = output[outputField];
              }
            });
            if (!_.isEmpty(outputChanges)) {
              outputs[output.name] = outputChanges;
            }
          });
        } else if (DOJO_ROOT_FIELDS.includes(field)) {
          rootChanges[field] = delta[field];
        }
      });
      return sendDojoUpdate(delta.id, rootChanges, maintainer, parameters, outputs);
    });

  await Promise.all(promises);
};

const sendDojoUpdate = async(id, changes, maintainer, parametersMap, outputsMap) => {
  if (!id || (_.isEmpty(changes) && _.isEmpty(maintainer) && _.isEmpty(parametersMap) && _.isEmpty(outputsMap))) {
    return;
  }

  // get latest from Dojo
  let dojoModel;
  try {
    dojoModel = await requestAsPromise({
      method: 'GET',
      url: process.env.DOJO_URL + '/models/' + id,
      headers: {
        'Authorization': basicAuthToken,
        'Content-type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // This is currently returning strings rather than JSON
    if (_.isString(dojoModel)) {
      dojoModel = JSON.parse(dojoModel);
    }

    if (!_.isObject(dojoModel) || _.isEmpty(dojoModel)) {
      return;
    }
  } catch (err) {
    Logger.info(`No model in Dojo found for id ${id}`);
    return;
  }

  // construct payload
  const payload = changes;

  // overwrite any changed maintainer fields
  if (!_.isEmpty(maintainer)) {
    payload.maintainer = {
      ...dojoModel.maintainer,
      ...maintainer
    };
  }
  // apply all param and output changes matching by name
  if (!_.isEmpty(parametersMap) && dojoModel.parameters) {
    payload.parameters = dojoModel.parameters.map(param =>
      Object.assign(param, parametersMap[param.name] || {}));
  }
  if (!_.isEmpty(outputsMap) && dojoModel.outputs) {
    payload.outputs = dojoModel.outputs.map(output =>
      Object.assign(output, outputsMap[output.name] || {}));
  }

  // send payload
  try {
    Logger.info(`Sending model patch request to Dojo for ${id}`);
    await requestAsPromise({
      method: 'PATCH',
      url: process.env.DOJO_URL + '/models/' + id,
      headers: {
        'Authorization': basicAuthToken,
        'Content-type': 'application/json',
        'Accept': 'application/json'
      },
      json: payload
    });
  } catch (err) {
    Logger.error('Error patching model in Dojo ');
    Logger.error(JSON.stringify(err));
  }
};

/**
 * Generate sparkline data for the provided datacubes
 */
const generateSparklines = async(datacubes) => {
  const datacubeMap = {};
  datacubes.forEach(datacube => {
    datacubeMap[datacube.id] = {
      datacube,
      params: {
        key: datacube.id,
        data_id: datacube.dataId,
        run_id: datacube.runId,
        feature: datacube.feature,
        resolution: datacube.resolution,
        temporal_agg: datacube.temporalAgg,
        spatial_agg: datacube.spatialAgg
      }
    };
  });
  const bulkTimeseries = await getBulkTimeseries(Object.values(datacubeMap).map(d => d.params));

  const datacubeDeltas = bulkTimeseries.map(keyedTimeseries => {
    const {
      resolution,
      temporalAgg,
      rawResolution,
      finalRawTimestamp
    } = datacubeMap[keyedTimeseries.key].datacube;

    const points = correctIncompleteTimeseries(keyedTimeseries.timeseries, rawResolution, resolution, temporalAgg, new Date(finalRawTimestamp));
    const sparkline = points.map(point => point.value);

    return {
      id: keyedTimeseries.key,
      sparkline
    };
  });

  return await updateDatacubes(datacubeDeltas);
};

/**
 * Deprecate datacubes and update any references to it from previously deprecated datacubes
 */
const deprecateDatacubes = async(newDatacubeId, oldDatacubeIds) => {
  if (!_.isArray(oldDatacubeIds) || oldDatacubeIds.length === 0) {
    return;
  }
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);

  // Search by data_id so that this works for indicators as well
  const idsToDeprecate = await getDatacubes({
    clauses: [
      { field: 'dataId', operand: 'or', isNot: false, values: oldDatacubeIds }
    ]
  }, { includes: ['id'] });

  // Search for all datacubes that reference the one we're about to deprecate
  // Ex. If we have deprecated datacubes 'v1' and 'v1.1' which are succeeded by 'v2'
  // In order to deprecate 'v2' with 'v3', we much update 'v1' and 'v1.1' as well as 'v2'
  const deprecatedIdsToUpdate = await getDatacubes({
    clauses: [
      { field: 'newVersionId', operand: 'or', isNot: false, values: oldDatacubeIds }
    ]
  }, { includes: ['id'] });

  const updateDeltas = [];
  idsToDeprecate
    .filter(id => !deprecatedIdsToUpdate.includes(id))
    .forEach(doc => {
      updateDeltas.push({
        id: doc.id,
        status: 'DEPRECATED',
        new_version_data_id: newDatacubeId
      });
    });
  deprecatedIdsToUpdate.forEach(doc => {
    updateDeltas.push({
      id: doc.id,
      new_version_data_id: newDatacubeId
    });
  });

  return await connection.update(updateDeltas);
};

/**
 * Returns field aggregations
 *
 * @param {object} filters
 * @param {array} fields
 */
const facets = async (filters, fields) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  const facets = await connection.getFacets(filters, fields);

  return facets;
};

/**
 * Search various fields in ES for terms starting with the queryString
 */
const searchFields = async (searchField, queryString) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  const matchedTerms = await connection.searchFields(searchField, queryString);
  return matchedTerms;
};

const getTimeseries = async (dataId, runId, feature, resolution, temporalAgg, spatialAgg, region = null) => {
  Logger.info(`Get timeseries data from wm-go: ${dataId} ${feature}`);

  const options = {
    method: 'GET',
    url: process.env.WM_GO_URL + '/maas/output/timeseries' +
      `?data_id=${encodeURI(dataId)}&run_id=${encodeURI(runId)}&feature=${encodeURI(feature)}` +
      `&resolution=${resolution}&temporal_agg=${temporalAgg}&spatial_agg=${spatialAgg}` +
      // optional
      (region && !_.isEmpty(region) ? `&region_id=${encodeURI(region)}` : ''),
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: {}
  };
  const response = await requestAsPromise(options);
  return response;
};

const getBulkTimeseries = async (timeseriesParams) => {
  Logger.info(`Get ${timeseriesParams.length} timeseries in bulk from wm-go for`);

  const options = {
    method: 'POST',
    url: process.env.WM_GO_URL + '/maas/output/bulk-timeseries/generic',
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    json: {
      timeseries_params: timeseriesParams
    }
  };
  const response = await requestAsPromise(options);
  return response;
};


module.exports = {
  getDatacubes,
  getDatasets,
  countDatacubes,

  insertDatacube,
  updateDatacube,
  updateDatacubes,
  generateSparklines,
  deprecateDatacubes,

  facets,
  searchFields,

  getTimeseries
};

