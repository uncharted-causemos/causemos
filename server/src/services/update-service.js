const _ = require('lodash');
const { v4: uuid } = require('uuid');

const Logger = require('#@/config/logger.js');
const { Adapter, RESOURCE } = require('#@/adapters/es/adapter.js');
const {
  updateFactorPolarity,
  updateFactorGrounding,
  discardStatement,
  vetStatement,
  reverseRelation,
} = require('./update-service-helper');

const indraService = require('#@/services/external/indra-service.js');
const projectService = require('#@/services/project-service.js');
// const cache = require('#@/cache/node-lru-cache.js');

/**
 * Add additional fields to logs to pass as feedback to INDRA
 *
 * @param {string} projectId
 * @param {array} audits
 */
const _buildCurationLogs = async (projectId, audits) => {
  const empty2null = (v) => {
    return v === '' ? null : v;
  };

  const curations = {};
  for (let i = 0; i < audits.length; i++) {
    const audit = audits[i];

    [audit.before.subj, audit.before.obj, audit.after.subj, audit.after.obj].forEach((item) => {
      item.concept = [item.theme, item.theme_property, item.process, item.process_property].map(
        empty2null
      );
      delete item.theme;
      delete item.theme_property;
      delete item.process;
      delete item.process_property;
    });

    curations[audit.matches_hash] = {
      project_id: projectId,
      statement_id: audit.statement_id,
      update_type: audit.update_type,
      before: audit.before,
      after: audit.after,
    };
  }

  return {
    project_id: projectId,
    curations: curations,
  };
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
      const result = await projectService.ontologyComposition(
        projectId,
        updateConfig.subj.newValue
      );
      updateConfig.subj.theme = result.theme;
      updateConfig.subj.theme_property = result.theme_property;
      updateConfig.subj.process = result.process;
      updateConfig.subj.process_property = result.process_property;

      // Need to account for things that fall outside of ontology
      if (_.isNil(updateConfig.subj.theme)) {
        updateConfig.subj.theme = updateConfig.subj.newValue;
      }
    }
    if (updateConfig.obj && updateConfig.obj.newValue) {
      const result = await projectService.ontologyComposition(projectId, updateConfig.obj.newValue);
      updateConfig.obj.theme = result.theme;
      updateConfig.obj.theme_property = result.theme_property;
      updateConfig.obj.process = result.process;
      updateConfig.obj.process_property = result.process_property;

      // Need to account for things that fall outside of ontology
      if (_.isNil(updateConfig.obj.theme)) {
        updateConfig.obj.theme = updateConfig.obj.newValue;
      }
    }
    Logger.info(
      `Injecting compositional ontology concepts for factor regrounding ${JSON.stringify(
        updateConfig
      )}`
    );
  }

  const batchId = await batchUpdate(
    projectId,
    _.clone(statementIds),
    updateFnGenerator(projectId, updateConfig)
  );
  return batchId;
};

const batchUpdate = async (projectId, statementIds, updateFn) => {
  const BATCH_SIZE = 1000;
  const statement = Adapter.get(RESOURCE.STATEMENT, projectId);

  const batchId = uuid();
  while (true) {
    const batchedIds = statementIds.splice(0, BATCH_SIZE);
    if (_.isEmpty(batchedIds)) break;

    const statements = await statement.find(
      {
        clauses: [{ field: 'id', values: batchedIds, operand: 'OR', isNot: false }],
      },
      { size: 1000 }
    );

    await updateFn(statements, batchId);
  }
  return batchId;
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
      subj: _.pick(statement.subj, [
        'factor',
        'concept',
        'polarity',
        'concept_score',
        'theme',
        'theme_property',
        'process',
        'process_property',
      ]),
      obj: _.pick(statement.obj, [
        'factor',
        'concept',
        'polarity',
        'concept_score',
        'theme',
        'theme_property',
        'process',
        'process_property',
      ]),
    };
  };

  return async (statements, batchId) => {
    const audits = [];
    statements.forEach((statement) => {
      const auditEntry = {
        modified_at: Date.now(),
        project_id: projectId,
        batch_id: batchId,
        statement_id: statement.id,
        matches_hash: statement.matches_hash,
        update_type: updateType,
        before: {},
        after: {},
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
  const modifiedAt = Date.now();
  while (true) {
    if (_.isEmpty(statementIds)) break;
    const batchIds = statementIds.splice(0, BATCH_SIZE);
    const statementPayloads = batchIds.map((d) => {
      return {
        id: d,
        belief_score: statementBeliefScores[d],
        modified_at: modifiedAt,
      };
    });
    await statementConnection.update(statementPayloads);
  }
};

module.exports = {
  updateStatements,
  updateAllBeliefScores,
};
