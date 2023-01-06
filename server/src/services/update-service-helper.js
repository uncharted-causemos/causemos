const _ = require('lodash');

const STATES = Object.freeze({
  STAGED: 0,
  NORMAL: 1,
  VETTED: 2,
  DELETED: 3,
});

// Helper function to recompute wm data structure
const _recalculateWM = (statement) => {
  statement.wm.edge = statement.subj.concept + '///' + statement.obj.concept;
  statement.wm.is_selfloop = statement.subj.concept === statement.obj.concept;
  statement.wm.min_grounding_score = Math.min(
    statement.subj.concept_score,
    statement.obj.concept_score
  );
  statement.wm.statement_polarity = statement.subj.polarity * statement.obj.polarity;
  statement.wm.edited = 1;
};

/**
 * Factor regrounding update generator.
 */
const updateFactorGrounding = (statement, updateConfig) => {
  // FIXME: do we really want to do this??
  const updateCandidates = (target, config) => {
    const match = target.candidates.find((d) => d.name === config.oldValue);
    if (!_.isNil(match)) {
      match.score = 1.0;
    } else {
      target.candidates.push({ name: config.newValue, score: 1.0 });
    }
  };
  const subj = updateConfig.subj;
  const obj = updateConfig.obj;

  // Update subject and object
  if (!_.isNil(subj) && statement.subj.concept === subj.oldValue) {
    statement.subj.concept = subj.newValue;
    statement.subj.concept_score = 1.0;
    statement.subj.theme = subj.theme || '';
    statement.subj.theme_property = subj.theme_property || '';
    statement.subj.process = subj.process || '';
    statement.subj.process_property = subj.process_property || '';

    updateCandidates(statement.subj, subj);
  }
  if (!_.isNil(obj) && statement.obj.concept === obj.oldValue) {
    statement.obj.concept = obj.newValue;
    statement.obj.concept_score = 1.0;
    statement.obj.theme = obj.theme || '';
    statement.obj.theme_property = obj.theme_property || '';
    statement.obj.process = obj.process || '';
    statement.obj.process_property = obj.process_property || '';

    updateCandidates(statement.obj, obj);
  }

  // Recalulate computed fields
  _recalculateWM(statement);
};

/**
 * Set statement to deleted state
 */
const discardStatement = (statement) => {
  statement.wm.state = STATES.DELETED;
  statement.wm.edited = 1;
};

/**
 * Set statement to be "vetted"
 */
const vetStatement = (statement, updateConfig) => {
  statement.wm.state = STATES.VETTED;
};

/**
 * Update subject and object polarities
 */
const updateFactorPolarity = (statement, updateConfig) => {
  const subj = updateConfig.subj;
  const obj = updateConfig.obj;
  if (!_.isNil(subj) && statement.subj.polarity === subj.oldValue) {
    statement.subj.polarity = +subj.newValue;
  }
  if (!_.isNil(obj) && statement.obj.polarity === obj.oldValue) {
    statement.obj.polarity = +obj.newValue;
  }

  // Recalulate computed fields
  _recalculateWM(statement);
};

/**
 * Basically swap subject and object
 */
const reverseRelation = (statement) => {
  const swap = statement.subj;
  statement.subj = statement.obj;
  statement.obj = swap;

  // Recalulate computed fields
  _recalculateWM(statement);
};

module.exports = {
  updateFactorPolarity,
  updateFactorGrounding,
  vetStatement,
  discardStatement,
  reverseRelation,
};
