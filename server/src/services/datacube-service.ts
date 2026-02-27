import _ from 'lodash';
import { Adapter, RESOURCE, SEARCH_LIMIT } from '#@/adapters/es/adapter.js';
import requestAsPromise from '#@/util/request-as-promise.js';
import * as domainProjectService from '#@/services/domain-project-service.js';
import { getFlowStatus, getFlowLogs } from '#@/services/external/prefect-queue-service.js';
import { processFilteredData, removeUnwantedData } from '#@/util/post-processing-util.js';
import { correctIncompleteTimeseries } from '#@/util/incomplete-data-detection.js';
import { getDatacubeDefaultState } from '#@/util/datacube-util.js';
import Logger from '#@/config/logger.js';
import config from '#@/config/yargs-wrapper.js';
import * as auth from '#@/util/auth-util.js';

const shouldSyncDojo = config.dojoSync;
const basicAuthToken = auth.getBasicAuthToken(process.env.DOJO_USERNAME, process.env.DOJO_PASSWORD);

const DOJO_ROOT_FIELDS = [
  'description',
  'category',
  'domains',
  'data_sensitivity',
  'data_quality',
  'tags',
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
  'max',
];

const DOJO_OUTPUT_FIELDS = ['display_name', 'description', 'unit', 'unit_description'];

/**
 * Return datacubes that match the provided filter
 */
export const getDatacubes = async (filter: any, options: any) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  if (!options.size) {
    options.size = SEARCH_LIMIT;
  }
  if (!options.excludes) {
    options.excludes = ['outputs.ontologies', 'qualifier_outputs.ontologies', 'ontology_matches'];
  }
  return await connection.find(filter, options);
};

/**
 * Return datacubes grouped by their data_id. This represents the concept of datasets.
 */
export const getDatasets = async (type: string, limit: number) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  const searchLimit = limit > 0 && limit <= SEARCH_LIMIT ? limit : SEARCH_LIMIT;
  return await connection.searchDatasets(type, searchLimit);
};

/**
 * Return the total number of datacubes (models + indicators) that match the provided filter
 */
export const countDatacubes = async (filter: any) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  return await connection.count(filter);
};

/**
 * Insert a new datacube.
 */
export const insertDatacube = async (metadata: any) => {
  Logger.info(`Start insert datacube ${metadata.name} ${metadata.id}`);

  const deprecatedIds = metadata.deprecatesIDs;
  metadata.type = metadata.type || 'model';
  metadata.is_hidden = false;
  metadata.is_stochastic = metadata.is_stochastic || metadata.stochastic;
  processFilteredData(metadata);
  removeUnwantedData(metadata);

  metadata.data_id = metadata.id;
  metadata.status = 'REGISTERED';

  const validOutput =
    metadata.outputs.filter(
      (o: any) => o.type === 'int' || o.type === 'float' || o.type === 'boolean'
    )[0] || metadata.outputs[0];
  metadata.default_feature = validOutput.name;

  const fields = [metadata.outputs, metadata.parameters];
  if (metadata.qualifier_outputs) {
    fields.push(metadata.qualifier_outputs);
  }

  const ontologyMatches = fields
    .map((field: any[]) => {
      return field
        .filter((variable: any) => variable.ontologies)
        .map((variable: any) => [
          ...variable.ontologies.concepts,
          ...variable.ontologies.processes,
          ...variable.ontologies.properties,
        ]);
    })
    .flat(2);

  metadata.ontology_matches = _.sortedUniqBy(
    _.orderBy(ontologyMatches, ['name', 'score'], ['desc', 'desc']),
    'name'
  );

  fields.forEach((field: any[]) => {
    field.forEach((variable: any) => {
      variable.ontologies = undefined;
    });
  });

  metadata.default_state = getDatacubeDefaultState(
    metadata.data_id,
    metadata.default_feature,
    false
  );

  await domainProjectService.updateDomainProjects(metadata);

  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  try {
    const result = await connection.insert([metadata]);

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
export const updateDatacube = async (metadataDelta: any) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  await updateDojoMetadata([metadataDelta]);
  return await connection.update([metadataDelta]);
};

/**
 * Update datacubes with the specified changes
 */
export const updateDatacubes = async (metadataDeltas: any[], notifyDojo = true) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  if (notifyDojo) {
    await updateDojoMetadata(metadataDeltas);
  }
  return await connection.update(metadataDeltas, 'wait_for');
};

/**
 * Send any relevant updates to the metadata to Dojo
 */
const updateDojoMetadata = async (metadataDeltas: any[]) => {
  if (!shouldSyncDojo) {
    return;
  }

  const promises = metadataDeltas
    .filter(
      (delta: any) => delta.type !== 'indicator' && (!delta.data_id || delta.data_id === delta.id)
    )
    .map((delta: any) => {
      const rootChanges: Record<string, any> = {};
      let maintainer: Record<string, any> = {};
      const parameters: Record<string, any> = {};
      const outputs: Record<string, any> = {};
      Object.keys(delta).forEach((field) => {
        if (field === 'maintainer') {
          maintainer = delta.maintainer || {};
        } else if (field === 'parameters') {
          delta.parameters.forEach((param: any) => {
            const paramChanges: Record<string, any> = {};
            Object.keys(param).forEach((paramField) => {
              if (DOJO_PARAMETER_FIELDS.includes(paramField)) {
                paramChanges[paramField] = param[paramField];
              }
            });
            if (!_.isEmpty(paramChanges)) {
              parameters[param.name] = paramChanges;
            }
          });
        } else if (field === 'outputs') {
          delta.outputs.forEach((output: any) => {
            const outputChanges: Record<string, any> = {};
            Object.keys(output).forEach((outputField) => {
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

const sendDojoUpdate = async (
  id: string,
  changes: Record<string, any>,
  maintainer: Record<string, any>,
  parametersMap: Record<string, any>,
  outputsMap: Record<string, any>
) => {
  if (
    !id ||
    (_.isEmpty(changes) &&
      _.isEmpty(maintainer) &&
      _.isEmpty(parametersMap) &&
      _.isEmpty(outputsMap))
  ) {
    return;
  }

  let dojoModel: any;
  try {
    dojoModel = await requestAsPromise({
      method: 'GET',
      url: process.env.DOJO_URL + '/models/' + id,
      headers: {
        Authorization: basicAuthToken,
        'Content-type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (_.isString(dojoModel)) {
      dojoModel = JSON.parse(dojoModel);
    }

    if (!_.isObject(dojoModel) || _.isEmpty(dojoModel)) {
      return;
    }
  } catch (_err) {
    Logger.info(`No model in Dojo found for id ${id}`);
    return;
  }

  // Cast to any to avoid TypeScript narrowing from _.isObject
  const dojoModelAny: any = dojoModel;
  const payload: Record<string, any> = { ...changes };

  if (!_.isEmpty(maintainer)) {
    payload.maintainer = {
      ...dojoModelAny.maintainer,
      ...maintainer,
    };
  }
  if (!_.isEmpty(parametersMap) && dojoModelAny.parameters) {
    payload.parameters = dojoModelAny.parameters.map((param: any) =>
      Object.assign(param, parametersMap[param.name] || {})
    );
  }
  if (!_.isEmpty(outputsMap) && dojoModelAny.outputs) {
    payload.outputs = dojoModelAny.outputs.map((output: any) =>
      Object.assign(output, outputsMap[output.name] || {})
    );
  }

  try {
    Logger.info(`Sending model patch request to Dojo for ${id}`);
    await requestAsPromise({
      method: 'PATCH',
      url: process.env.DOJO_URL + '/models/' + id,
      headers: {
        Authorization: basicAuthToken,
        'Content-type': 'application/json',
        Accept: 'application/json',
      },
      data: payload,
    });
  } catch (err) {
    Logger.error('Error patching model in Dojo ');
    Logger.error(JSON.stringify(err));
  }
};

/**
 * Generate sparkline data for the provided datacubes
 */
export const generateSparklines = async (datacubes: any[]) => {
  const datacubeMap: Record<string, any> = {};
  datacubes.forEach((datacube: any) => {
    datacubeMap[datacube.id] = {
      datacube,
      params: {
        key: datacube.id,
        data_id: datacube.dataId,
        run_id: datacube.runId,
        feature: datacube.feature,
        resolution: datacube.resolution,
        temporal_agg: datacube.temporalAgg,
        spatial_agg: datacube.spatialAgg,
      },
    };
  });
  const bulkTimeseries = await getBulkTimeseries(
    Object.values(datacubeMap).map((d: any) => d.params)
  );

  const datacubeDeltas = bulkTimeseries.map((keyedTimeseries: any) => {
    const { resolution, temporalAgg, rawResolution, finalRawTimestamp } =
      datacubeMap[keyedTimeseries.key].datacube;

    const points = correctIncompleteTimeseries(
      keyedTimeseries.timeseries,
      rawResolution,
      resolution,
      temporalAgg,
      new Date(finalRawTimestamp)
    );
    const sparkline = points.map((point: any) => point.value);

    return {
      id: keyedTimeseries.key,
      sparkline,
    };
  });

  return await updateDatacubes(datacubeDeltas);
};

/**
 * Deprecate datacubes and update any references to it from previously deprecated datacubes
 */
export const deprecateDatacubes = async (newDatacubeId: string, oldDatacubeIds: string[]) => {
  if (!_.isArray(oldDatacubeIds) || oldDatacubeIds.length === 0) {
    return;
  }
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);

  const idsToDeprecate = await getDatacubes(
    {
      clauses: [{ field: 'dataId', operand: 'or', isNot: false, values: oldDatacubeIds }],
    },
    { includes: ['id'] }
  );

  const deprecatedIdsToUpdate = await getDatacubes(
    {
      clauses: [{ field: 'newVersionId', operand: 'or', isNot: false, values: oldDatacubeIds }],
    },
    { includes: ['id'] }
  );

  const updateDeltas: any[] = [];
  idsToDeprecate
    .filter((id: any) => !deprecatedIdsToUpdate.includes(id))
    .forEach((doc: any) => {
      updateDeltas.push({
        id: doc.id,
        status: 'DEPRECATED',
        new_version_data_id: newDatacubeId,
      });
    });
  deprecatedIdsToUpdate.forEach((doc: any) => {
    updateDeltas.push({
      id: doc.id,
      new_version_data_id: newDatacubeId,
    });
  });

  return await connection.update(updateDeltas);
};

/**
 * Returns field aggregations
 */
export const facets = async (filters: any, fields: any[]) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  const result = await connection.getFacets(filters, fields);
  return result;
};

/**
 * Search various fields in ES for terms starting with the queryString
 */
export const searchFields = async (searchField: string, queryString: string) => {
  const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
  const matchedTerms = await connection.searchFields(searchField, queryString);
  return matchedTerms;
};

export const getTimeseries = async (
  dataId: string,
  runId: string,
  feature: string,
  resolution: string,
  temporalAgg: string,
  spatialAgg: string,
  region: any = null
) => {
  Logger.info(`Get timeseries data from wm-go: ${dataId} ${feature}`);

  const options = {
    method: 'GET',
    url:
      process.env.WM_GO_URL +
      '/maas/output/timeseries' +
      `?data_id=${encodeURI(dataId)}&run_id=${encodeURI(runId)}&feature=${encodeURI(feature)}` +
      `&resolution=${resolution}&temporal_agg=${temporalAgg}&spatial_agg=${spatialAgg}` +
      (region && !_.isEmpty(region) ? `&region_id=${encodeURI(region)}` : ''),
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
    },
  };
  const response = await requestAsPromise(options);
  return response;
};

export const getBulkTimeseries = async (timeseriesParams: any[]) => {
  Logger.info(`Get ${timeseriesParams.length} timeseries in bulk from wm-go for`);

  const options = {
    method: 'POST',
    url: process.env.WM_GO_URL + '/maas/output/bulk-timeseries/generic',
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json',
    },
    data: {
      timeseries_params: timeseriesParams,
    },
  };
  const response = await requestAsPromise(options);
  return response;
};

/**
 * Get the logs of a datacube post process job.
 */
export const getJobLogs = async (indicatorId: string, flowId?: string) => {
  Logger.info(`Get logs for ${flowId ? 'flow id' : 'indicator id'} ${flowId || indicatorId}`);

  if (!flowId) {
    flowId = await _getFlowIdForIndicator(indicatorId);
    if (!flowId) {
      Logger.error(`No indicator with id ${indicatorId}`);
      return;
    }
  }

  return await getFlowLogs(flowId);
};

/**
 * Get the status of a prefect flow.
 */
export const getJobStatus = async (indicatorId: string, flowId?: string) => {
  Logger.info(`Get job status for ${flowId ? 'flow id' : 'run id'} ${flowId || indicatorId}`);

  if (!flowId) {
    flowId = await _getFlowIdForIndicator(indicatorId);
    if (!flowId) {
      Logger.error(`No indicator with id ${indicatorId}`);
      return;
    }
  }

  return await getFlowStatus(flowId);
};

const _getFlowIdForIndicator = async (indicatorId: string) => {
  const indicators = await getDatacubes(
    {
      clauses: [{ field: 'id', operand: 'or', isNot: false, values: [indicatorId] }],
    },
    { size: 1, includes: ['id', 'flow_id'] }
  );
  if (indicators.length === 0) {
    return undefined;
  }
  return _.get(indicators[0], 'flow_id');
};
