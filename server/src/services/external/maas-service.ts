import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import { Adapter, RESOURCE, SEARCH_LIMIT } from '#@/adapters/es/adapter.js';
import { processFilteredData, removeUnwantedData } from '#@/util/post-processing-util.js';
import requestAsPromise from '#@/util/request-as-promise.js';
import { getDatacubeDefaultState } from '#@/util/datacube-util.js';
import {
  sendToPipeline,
  getFlowStatus,
  getFlowLogs,
} from '#@/services/external/prefect-queue-service.js';
import Logger from '#@/config/logger.js';
import * as auth from '#@/util/auth-util.js';
import * as domainProjectService from '#@/services/domain-project-service.js';
import * as datacubeService from '#@/services/datacube-service.js';

const basicAuthToken = auth.getBasicAuthToken(process.env.DOJO_USERNAME, process.env.DOJO_PASSWORD);

import config from '#@/config/yargs-wrapper.js';
const allowModelRuns = config.allowModelRuns;

const IMPLICIT_QUALIFIERS = [
  'timestamp',
  'country',
  'admin1',
  'admin2',
  'admin3',
  'lat',
  'lng',
  'feature',
  'value',
];
const QUALIFIER_MAX_COUNT = 10000;
const QUALIFIER_TIMESERIES_MAX_COUNT = 100;
const QUALIFIER_TIMESERIES_MAX_LEVEL = 1;

/**
 * Submit a new model run to Jataware and store information about it in ES.
 */
export const submitModelRun = async (metadata: any) => {
  const { model_id, model_name, parameters, is_default_run = false } = metadata;

  const filteredMetadata = {
    model_id,
    model_name,
    parameters,
    id: uuid(),
    data_paths: [],
    is_default_run,
    created_at: Date.now(),
    tags: [],
  };
  Logger.info('Submitting model run for execution');

  const pipelinePayload = {
    method: 'POST',
    url: process.env.DOJO_URL + '/runs',
    headers: {
      Authorization: basicAuthToken,
      'Content-type': 'application/json',
      Accept: 'application/json',
    },
    data: filteredMetadata,
  };

  Logger.info(`Submitting execution request for id: ${filteredMetadata.id}`);
  let result: any;
  try {
    if (allowModelRuns) {
      result = await requestAsPromise(pipelinePayload);
    }
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }
  Logger.info(`Model execution response ${result}`);

  try {
    // Insert into ES
    const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);

    const existingRunsCount = await connection.count([
      { field: 'model_id', value: filteredMetadata.model_id },
      { field: 'is_default_run', value: false },
    ]);
    const runName = filteredMetadata.is_default_run ? 'Default' : 'Run ' + (existingRunsCount + 1);

    const esResult = await connection.insert(
      {
        ...filteredMetadata,
        status: 'SUBMITTED',
        name: runName,
      },
      (d: any) => d.id
    );
    // If we didn't send the run to Dojo, "simulate" it and fail after some time
    if (!allowModelRuns) {
      setTimeout(async () => {
        await connection.update(
          {
            ...filteredMetadata,
            status: 'PROCESSING',
          },
          (d: any) => d.id
        );
        setTimeout(async () => {
          await markModelRunFailed(filteredMetadata);
        }, 20000);
      }, 10000);
    }
    return { result: { es_response: esResult, run_id: filteredMetadata.id }, code: 201 };
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }
};

/**
 * Start a datacube ingest prefect flow using the provided ids
 */
export const startModelOutputPostProcessing = async (
  metadata: any,
  selectedOutputTasks: any[] = []
) => {
  Logger.info(`Start model output processing ${metadata.model_name} ${metadata.id} `);
  if (!metadata.model_id || !metadata.id) {
    const err = 'Required ids for model output post processing were not provided';
    Logger.error(err);
    return { result: { error: err }, code: 400 };
  }
  const filters = {
    clauses: [{ field: 'id', operand: 'or', isNot: false, values: [metadata.model_id] }],
  };
  const modelMetadata = (
    await datacubeService.getDatacubes(filters, {
      includes: ['outputs', 'qualifier_outputs'],
      size: 1,
    })
  )[0];
  if (!modelMetadata) {
    return {
      result: {
        error: `Unable to process run. Model metadata for model id ${metadata.model_id} was not found.`,
      },
      code: 409,
    };
  }

  const qualifierMap: Record<string, any> = {};
  let weightColumn = '';
  if (modelMetadata.qualifier_outputs) {
    modelMetadata.outputs.forEach((output: any) => {
      qualifierMap[output.name] = modelMetadata.qualifier_outputs
        .filter(
          (q: any) =>
            !IMPLICIT_QUALIFIERS.includes(q.name) &&
            (!q.qualifier_role || q.qualifier_role === 'breakdown')
        )
        .filter((qualifier: any) => qualifier.related_features.includes(output.name))
        .map((q: any) => q.name);
    });
    const weightQualifier = modelMetadata.qualifier_outputs.find(
      (q: any) =>
        !IMPLICIT_QUALIFIERS.includes(q.name) &&
        q.qualifier_role === 'weight' &&
        q.related_features.length > 0
    );
    if (weightQualifier) {
      weightColumn = weightQualifier.name;
    }
  }

  // Remove extra fields from Jataware
  metadata.attributes = undefined;
  metadata.default_run = undefined;

  let httpResponse: any;
  let docIds: string[] = [];
  let esResult: any;
  try {
    const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
    if (await connection.exists([{ field: 'id', value: metadata.id }])) {
      esResult = await connection.update(
        {
          ...metadata,
          status: 'PROCESSING',
        },
        (d: any) => d.id
      );
      docIds = [metadata.id];
      httpResponse = { result: { es_response: esResult }, code: 200 };
    } else {
      esResult = await connection.insert(
        {
          ...metadata,
          status: 'TEST',
        },
        (d: any) => d.id
      );
      httpResponse = { result: { es_response: esResult }, code: 201 };
    }
  } catch (err) {
    httpResponse = { result: { error: err }, code: 500 };
  }

  const flowParameters: Record<string, any> = {
    model_id: metadata.model_id,
    run_id: metadata.id,
    doc_ids: docIds,
    data_paths: metadata.data_paths,
    model_bucket: process.env.S3_MODELS_BUCKET,
    indicator_bucket: process.env.S3_INDICATORS_BUCKET,
    qualifier_map: qualifierMap,
    weight_column: weightColumn,
    compute_tiles: true,
    qualifier_thresholds: {
      max_count: QUALIFIER_MAX_COUNT,
      regional_timeseries_count: QUALIFIER_TIMESERIES_MAX_COUNT,
      regional_timeseries_max_level: QUALIFIER_TIMESERIES_MAX_LEVEL,
    },
  };
  if (selectedOutputTasks.length > 0) {
    flowParameters.selected_output_tasks = selectedOutputTasks;
  }
  try {
    await sendToPipeline(flowParameters);
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }
  return httpResponse;
};

/**
 * Mark a model run as failed during model execution
 */
export const markModelRunFailed = async (metadata: any) => {
  Logger.info(`Marking model run as failed ${metadata.model_name} ${metadata.id} `);
  if (!metadata.id) {
    return { result: { error: 'Model run id missing' }, code: 400 };
  }

  try {
    const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
    const result = await connection.update(
      {
        id: metadata.id,
        status: 'EXECUTION FAILED',
      },
      (d: any) => d.id
    );
    return { result: { es_response: result }, code: 200 };
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }
};

/**
 * Return all model runs that match the specified filter
 */
export const getAllModelRuns = async (filter: any, includeVersion: boolean) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  return connection.find(filter, { size: SEARCH_LIMIT, version: includeVersion });
};

/**
 * Get the logs of a model run.
 */
export const getJobLogs = async (runId: string, flowId?: string) => {
  Logger.info(`Get logs for ${flowId ? 'flow id' : 'run id'} ${flowId || runId}`);

  if (!flowId) {
    flowId = await _getFlowIdForRun(runId);
    if (!flowId) {
      Logger.error(`No model run found for ${runId}`);
      return;
    }
  }

  return await getFlowLogs(flowId);
};

/**
 * Get the status of a prefect flow.
 */
export const getJobStatus = async (runId: string, flowId?: string) => {
  Logger.info(`Get job status for ${flowId ? 'flow id' : 'run id'} ${flowId || runId}`);

  if (!flowId) {
    flowId = await _getFlowIdForRun(runId);
    if (!flowId) {
      Logger.error(`No model run found for ${runId}`);
      return;
    }
  }

  return await getFlowStatus(flowId);
};

const _getFlowIdForRun = async (runId: string) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  const result = await connection.findOne([{ field: 'id', value: runId }], {
    includes: ['id', 'flow_id'],
  });
  return _.get(result, 'flow_id');
};

/**
 * Start a datacube ingest prefect flow for an indicator
 */
export const startIndicatorPostProcessing = async (
  metadata: any,
  fullReplace = false,
  selectedOutputTasks: any[] = []
) => {
  Logger.info(`Start indicator processing ${metadata.name} ${metadata.id} `);
  if (!metadata.id) {
    const err = 'Required ids for indicator post processing were not provided';
    Logger.error(err);
    return { result: { error: err }, code: 400 };
  }

  const deprecatedIds = metadata.deprecatesIDs;
  processFilteredData(metadata);
  removeUnwantedData(metadata);
  metadata.type = 'indicator';
  metadata.is_hidden = false;
  await domainProjectService.updateDomainProjects(metadata);

  const filters = {
    clauses: [
      { field: 'dataId', operand: 'or', isNot: false, values: [metadata.id] },
      { field: 'type', operand: 'or', isNot: false, values: ['indicator'] },
      {
        field: 'status',
        operand: 'or',
        isNot: false,
        values: ['READY', 'PROCESSING', 'PROCESSING FAILED'],
      },
    ],
  };
  const existingIndicators = await datacubeService.getDatacubes(filters, {
    includes: ['id', 'default_feature'],
  });

  if (existingIndicators.length > 0) {
    Logger.warn(
      `Indicators with data_id ${metadata.id} already exist. Duplicates will not be processed.`
    );
  }
  const existingIndicatorIds = existingIndicators.reduce(
    (map: Map<string, string>, i: any) => map.set(i.default_feature, i.id),
    new Map<string, string>()
  );

  const acceptedTypes = ['int', 'float', 'boolean', 'datetime'];
  const resolutions = ['annual', 'monthly', 'dekad', 'weekly', 'daily', 'other'];
  let highestRes = 0;

  const validQualifiers =
    metadata.qualifier_outputs?.filter((q: any) => !IMPLICIT_QUALIFIERS.includes(q.name)) ?? [];

  const numericOutputs = metadata.outputs.filter((output: any) =>
    acceptedTypes.includes(output.type)
  );
  if (numericOutputs.length < metadata.outputs.length) {
    Logger.warn(`Filtered out ${metadata.outputs.length - numericOutputs.length} indicators`);
  }

  const qualifierMap: Record<string, any> = {};
  let weightColumn = '';
  for (const output of numericOutputs) {
    qualifierMap[output.name] = validQualifiers
      .filter(
        (qualifier: any) =>
          qualifier.related_features.includes(output.name) &&
          (!qualifier.qualifier_role || qualifier.qualifier_role === 'breakdown')
      )
      .map((q: any) => q.name);
  }
  const weightQualifier = validQualifiers.find(
    (q: any) => q.qualifier_role === 'weight' && q.related_features.length > 0
  );
  if (weightQualifier) {
    weightColumn = weightQualifier.name;
  }

  const indicatorMetadata = numericOutputs.map((output: any) => {
    const outputRes = output.data_resolution && output.data_resolution.temporal_resolution;
    const resIndex = resolutions.indexOf(outputRes || '');
    highestRes = Math.max(highestRes, resIndex);

    const clonedMetadata = _.cloneDeep(metadata);
    clonedMetadata.data_id = metadata.id;
    clonedMetadata.id = existingIndicatorIds.get(output.name) || uuid();
    clonedMetadata.outputs = [output];
    clonedMetadata.family_name = metadata.family_name;
    clonedMetadata.default_feature = output.name;
    clonedMetadata.type = metadata.type;
    clonedMetadata.status = 'PROCESSING';

    let qualifierMatches: any[] = [];
    if (metadata.qualifier_outputs) {
      clonedMetadata.qualifier_outputs = _.cloneDeep(
        metadata.qualifier_outputs.filter((qualifier: any) =>
          qualifier.related_features.includes(output.name)
        )
      );

      qualifierMatches = clonedMetadata.qualifier_outputs
        .map((qualifier: any) => [
          qualifier.ontologies.concepts,
          qualifier.ontologies.processes,
          qualifier.ontologies.properties,
        ])
        .flat(2);

      clonedMetadata.qualifier_outputs.forEach((qualifier: any) => {
        qualifier.ontologies = undefined;
      });
    }

    const allMatches = qualifierMatches.concat(
      output.ontologies.concepts,
      output.ontologies.processes,
      output.ontologies.properties
    );

    output.ontologies = undefined;

    clonedMetadata.ontology_matches = _.sortedUniqBy(
      _.orderBy(allMatches, ['name', 'score'], ['desc', 'desc']),
      'name'
    );
    clonedMetadata.default_state = getDatacubeDefaultState(
      clonedMetadata.data_id,
      clonedMetadata.default_feature,
      true
    );
    return clonedMetadata;
  });

  const [replaceDocIds, newDocIds] = _.partition(indicatorMetadata, (meta: any) =>
    existingIndicatorIds.has(meta.default_feature)
  ).map((metaList: any[]) => metaList.map((meta: any) => meta.id));

  const deleteDocIds = fullReplace
    ? existingIndicators.map((i: any) => i.id).filter((id: string) => !replaceDocIds.includes(id))
    : [];

  Logger.info(
    `${newDocIds.length} new indicators will be added. ${replaceDocIds.length} indicators will be replaced.`
  );

  const docIds = indicatorMetadata.map((meta: any) => meta.id);
  const flowParameters: Record<string, any> = {
    model_id: metadata.id,
    doc_ids: docIds,
    run_id: 'indicator',
    data_paths: metadata.data_paths,
    model_bucket: process.env.S3_MODELS_BUCKET,
    indicator_bucket: process.env.S3_INDICATORS_BUCKET,
    temporal_resolution: resolutions[highestRes],
    qualifier_map: qualifierMap,
    weight_column: weightColumn,
    is_indicator: true,
    qualifier_thresholds: {
      max_count: QUALIFIER_MAX_COUNT,
      regional_timeseries_count: QUALIFIER_TIMESERIES_MAX_COUNT,
      regional_timeseries_max_level: QUALIFIER_TIMESERIES_MAX_LEVEL,
    },
  };
  if (selectedOutputTasks.length > 0) {
    flowParameters.selected_output_tasks = selectedOutputTasks;
  }
  try {
    await sendToPipeline(flowParameters);
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }

  try {
    const connection = Adapter.get(RESOURCE.DATA_DATACUBE);
    if (deleteDocIds.length > 0) {
      Logger.info(`${deleteDocIds.length} old indicators will be removed.`);
      await connection.delete(deleteDocIds.map((id: string) => ({ id })));
    }
    const result = await connection.insert(indicatorMetadata, (d: any) => d.id);
    const response = {
      result: {
        es_response: result,
        message: 'Documents inserted',
        new_ids: newDocIds,
        existing_ids: replaceDocIds,
        deleted_ids: deleteDocIds,
      },
      code: existingIndicators.length === 0 ? 201 : 200,
    };
    if (deprecatedIds) {
      await datacubeService.deprecateDatacubes(metadata.id, deprecatedIds);
    }
    return response;
  } catch (err) {
    return { result: { error: err }, code: 500 };
  }
};

/**
 * Update a model run with the specified changes
 */
export const updateModelRun = async (modelRun: any) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);
  return await connection.update(modelRun, (doc: any) => doc.id);
};

/**
 * Add a tag to multiple model runs
 */
export const addModelTag = async (filter: any, tag: string) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);

  const script = {
    lang: 'painless',
    params: {
      tag: tag,
    },
    source: `
      if (ctx._source.tags != null) {
        if (!ctx._source.tags.contains(params.tag)) {
          ctx._source.tags.add(params.tag);
        }
      } else {
        ctx._source.tags = [params.tag];
      }
    `,
  };
  return await connection.updateByQuery(filter, script);
};

/**
 * Remove a tag from multiple model runs
 */
export const removeModelTag = async (filter: any, tag: string) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);

  const script = {
    lang: 'painless',
    params: {
      tag: tag,
    },
    source: `
      if (ctx._source.tags != null) {
        int i = ctx._source.tags.indexOf(params.tag);
        if (i >= 0) {
          ctx._source.tags.remove(i);
        }
      }
    `,
  };
  return await connection.updateByQuery(filter, script);
};

/**
 * Rename a tag used multiple model runs
 */
export const renameModelTag = async (filter: any, oldTag: string, newTag: string) => {
  const connection = Adapter.get(RESOURCE.DATA_MODEL_RUN);

  const script = {
    lang: 'painless',
    params: {
      oldTag: oldTag,
      newTag: newTag,
    },
    source: `
      if (ctx._source.tags != null) {
        int i = ctx._source.tags.indexOf(params.oldTag);
        if (i >= 0) {
          ctx._source.tags.set(i, params.newTag);
        }
      }
    `,
  };
  return await connection.updateByQuery(filter, script);
};
