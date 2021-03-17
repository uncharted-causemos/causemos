const moment = require('moment');
const _ = require('lodash');
const uuid = require('uuid');

const Logger = rootRequire('/config/logger');
const { Adapter, RESOURCE } = rootRequire('adapters/es/adapter');
const {
  updateFactorPolarity,
  updateFactorGrounding,
  discardStatement,
  vetStatement,
  reverseRelation
} = require('./update-service-helper');

const indraService = rootRequire('/services/external/indra-service');
const projectService = rootRequire('/services/project-service');
const cache = rootRequire('/cache/node-lru-cache');

/**
 * Add additional fields to logs to pass as feedback to INDRA
 *
 * @param {string} projectId
 * @param {array} audits
 */
const _buildCurationLogs = async (projectId, audits) => {
  const project = cache.get(projectId);
  const curationLogs = audits.map(entry => {
    return {
      project_id: projectId,
      corpus_id: project.corpus_id || '',
      ...entry
    };
  });
  return curationLogs;
};

/**
 * Common update entry point
 * @param {string} projectId - project identifier
 * @param {object} updateConfig - update values
 * @param {array} statementIds - statement ids
 */
const updateStatements = async (projectId, updateConfig, statementIds) => {
  const updateType = updateConfig.updateType;
  Logger.info(`Update ${updateType} for ${statementIds.length} statements`);

  // We need to maintain compositional concepts behind the scenes, while using flattened concepts in the UI
  if (updateType === 'factor_grounding') {
    if (updateConfig.subj && updateConfig.subj.newValue) {
      const result = await projectService.ontologyConstituents(projectId, updateConfig.subj.newValue);
      updateConfig.subj.theme = result.theme;
      updateConfig.subj.theme_property = result.theme_property;
      updateConfig.subj.process = result.process;
      updateConfig.subj.process_property = result.process_property;
    }
    if (updateConfig.obj && updateConfig.obj.newValue) {
      const result = await projectService.ontologyConstituents(projectId, updateConfig.obj.newValue);
      updateConfig.obj.theme = result.theme;
      updateConfig.obj.theme_property = result.theme_property;
      updateConfig.obj.process = result.process;
      updateConfig.obj.process_property = result.process_property;
    }
    Logger.info(`Injecting compositional ontology concepts for factor regrounding ${JSON.stringify(updateConfig)}`);
  }

  await batchUpdate(projectId, _.clone(statementIds), updateFnGenerator(projectId, updateConfig));
};

const batchUpdate = async (projectId, statementIds, updateFn) => {
  const BATCH_SIZE = 1000;
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);

  const batchId = uuid();
  while (true) {
    const batchedIds = statementIds.splice(0, BATCH_SIZE);
    if (_.isEmpty(batchedIds)) break;

    const statements = await statement.find({
      clauses: [
        { field: 'id', values: batchedIds, operand: 'OR', isNot: false }
      ]
    }, { size: 1000 });

    await updateFn(statements, batchId);
  }
};


/**
 * A function generator for batched update
 *
 * @param {string} projectId - project identifier
 * @param {object} udpateConfig
 */
const updateFnGenerator = (projectId, updateConfig) => {
  const updateType = updateConfig.updateType;
  const statementAdapter = Adapter.get(RESOURCE.STATEMENT, projectId);
  const auditAdapter = Adapter.get(RESOURCE.AUDIT);

  let updateFn = null;
  if (updateType === 'discard_statement') {
    updateFn = discardStatement;
  } else if (updateType === 'vet_statement') {
    updateFn = vetStatement;
  } else if (updateType === 'factor_grounding') {
    updateFn = updateFactorGrounding;
  } else if (updateType === 'factor_polarity') {
    updateFn = updateFactorPolarity;
  } else if (updateType === 'reverse_relation') {
    updateFn = reverseRelation;
  } else {
    throw new Error(`Unknown update ${updateType}`);
  }

  const logEntry = (statement) => {
    return {
      wm: _.pick(statement.wm, ['state', 'readers']),
      subj: _.pick(statement.subj, ['factor', 'concept', 'polarity', 'concept_score']),
      obj: _.pick(statement.obj, ['factor', 'concept', 'polarity', 'concept_score'])
    };
  };

  return async (statements, batchId) => {
    const audits = [];
    statements.forEach(statement => {
      const auditEntry = {
        modified_at: moment().valueOf(),
        project_id: projectId,
        batch_id: batchId,
        statement_id: statement.id,
        update_type: updateType,
        before: {},
        after: {}
      };
      audits.push(auditEntry);
      // Log before
      auditEntry.before = logEntry(statement);

      updateFn(statement, updateConfig);

      // Log after
      auditEntry.after = logEntry(statement);
    });
    // build and send feedbackToIndra
    const curationLogs = await _buildCurationLogs(projectId, audits);
    indraService.sendFeedback(curationLogs).catch(function handleError(err) {
      Logger.warn(`Sending feedback to INDRA failed bactchId=${batchId} ` + err);
    });

    auditAdapter.insert(audits, () => uuid());
    return statementAdapter.update(statements);
  };
};

/**
 * Update statements returned from INDRA with the new belief score
 *
 * @param {sring} projectId
 * @param {map} statementBeliefScores - map of statementBeliefScores {statementId1: newScore1, statementId2: newScore2, ...}
 */
const updateAllBeliefScores = async (projectId, statementBeliefScores) => {
  const BATCH_SIZE = 5000;
  const statementConnection = Adapter.get(RESOURCE.STATEMENT, projectId);
  const statementIds = Object.keys(statementBeliefScores);
  const modifiedAt = moment().valueOf();
  while (true) {
    if (_.isEmpty(statementIds)) break;
    const batchIds = statementIds.splice(0, BATCH_SIZE);
    const statementPayloads = batchIds.map(d => {
      return {
        id: d,
        belief_score: statementBeliefScores[d],
        modified_at: modifiedAt
      };
    });
    await statementConnection.update(statementPayloads);
  }
};

module.exports = {
  updateStatements,
  updateAllBeliefScores
};
