const _ = require('lodash');
const { FIELDS, FIELD_TYPES, FIELD_LEVELS, NESTED_FIELD_PATHS } = require('./config');

/**
 * terms search fields query builder
 * @param {Object} clause clause object
 * @param {String} clause.field clause field name
 * @param {Array}  clause.values clause values
 * @param {String} clause.operand clause operand
 * @param {Boolean} clause.isNot clause negative search
 */
const _termsBuilder = (clause) => {
  const { field, values } = clause;
  const esFields = FIELDS[field].fields;
  const result = esFields.map(field => {
    return { terms: { [field]: values } };
  });

  if (clause.isNot === true) {
    return {
      bool: {
        must_not: result
      }
    };
  }
  return {
    bool: {
      should: result
    }
  };
};

/**
 * range query builder
 * @param {Object} clause clause object
 * @param {String} clause.field clause field name
 * @param {Array}  clause.values clause values
 * @param {String} clause.operand clause operand
 * @param {Boolean} clause.isNot clause negative search
 */
const _rangeBuilder = (clause) => {
  const { field, values } = clause;
  const fieldMeta = FIELDS[field];
  const esFields = fieldMeta.fields;
  const queries = [];

  esFields.forEach(esField => {
    values.forEach(range => {
      const resultRange = {};
      if (range[0] !== '--') {
        resultRange.gte = range[0];
      }
      if (range[1] !== '--') {
        resultRange.lt = range[1];
      }
      queries.push({
        range: {
          [esField]: resultRange
        }
      });
    });
  });
  if (clause.isNot === true) {
    return {
      bool: {
        must_not: queries
      }
    };
  }
  return {
    bool: {
      should: queries
    }
  };
};

/**
 * Wildcard builder
 * @param {Object} clause
 */
const _regexBuilder = (clause) => {
  const { field, values } = clause;
  const fieldMeta = FIELDS[field];
  const esFields = fieldMeta.fields;
  const queries = [];
  esFields.forEach(field => {
    values.forEach(value => {
      queries.push({
        wildcard: { // case insensitive search
          [field]: `*${value}*`
        }
      });
    });
  });
  if (clause.isNot === true) {
    return {
      bool: {
        must_not: queries
      }
    };
  }
  return {
    bool: {
      should: queries
    }
  };
};

/**
 * Specialty filter builder:
 *
 * Quality check filter -
 * Filter statements by the following conditions:
 * * Not evaluated - 'state' field is `1` aka `normal` and 'edited' to be false
 * * Vetted - `state` field is `2` aka 'vetted'
 * * Edited -  `edited` field is set to `true`
 * @param {Object} clause
 */
const _qualityFilterBuilder = (clause) => {
  const values = clause.values;
  // 1. Check what filter needs to be added
  const isVetted = values.includes('Vetted');
  const isEdited = values.includes('Edited');
  const isUnevaluated = values.includes('Not Evaluated');

  // 2. Create and return ES filters
  const queries = [];
  if (isVetted) {
    queries.push({ term: { 'wm.state': 2 } });
  }
  if (isEdited) {
    queries.push({ term: { 'wm.edited': 1 } });
  }
  if (isUnevaluated) {
    queries.push({
      bool: {
        filter: [
          { term: { 'wm.edited': 0 } },
          { term: { 'wm.state': 1 } }
        ]
      }
    });
  }

  if (clause.isNot === true) {
    return {
      bool: {
        must_not: queries
      }
    };
  }

  return {
    bool: {
      should: queries
    }
  };
};

/**
 * Checks whether the clause received is valid
 * See test for example
 * @param {Object} clause clause object
 * @param {String} clause.field clause field name
 * @param {Array}  clause.values clause values
 * @param {String} clause.operand clause operand
 * @param {Boolean} clause.isNot clause negative search
 */
const _validClauseCheck = (clause) => {
  const { values } = clause;
  if (!_.isArray(values)) {
    throw new Error('Value must be array');
  }
};

/**
 * filters out filter clauses by nested level
 * @param {Array} clauses
 * @param {Integer} documentLevel
 */
const levelFilter = (clauses, documentLevel) => {
  const result = clauses.filter(clause => {
    let fieldType;
    if (!_.isNil(clause)) {
      const fieldMeta = FIELDS[clause.field];
      fieldType = fieldMeta.level;
    }
    return fieldType === documentLevel;
  });
  return result;
};

/**
 * query builder to filter at the global (index) level
 *
 * By default:
 *   * self-loops are disabled
 *   * staged and deleted states are hidden
 *
 * @params clause{}  enable clause object
 * */
const buildEnableFilters = (clause) => {
  const values = _.get(clause, 'values') || [];
  const queries = [];
  if (values.indexOf('self-loop') < 0) {
    queries.push({
      term: {
        'wm.is_selfloop': false
      }
    });
  }
  /**
   * statement states:
   * 0: staged
   * 1: normal
   * 2: edited
   * 3: deleted
   */
  const states = [1, 2]; // default states
  if (values.indexOf('staged') > -1) {
    states.unshift(0);
  }
  if (values.indexOf('deleted') > -1) {
    states.push(3);
  }
  queries.push({
    terms: {
      'wm.state': states
    }
  });
  const result = {
    bool: {
      filter: queries
    }
  };
  return result;
};

/**
 * Translate general filter type clauses (terms, range, fuzzy) to ES queries
 * @params clauses{}   array of clauses
 * */
const _translateFilters = (clauses) => {
  const translatedFilters = [];
  clauses.forEach(clause => {
    _validClauseCheck(clause);
    const field = clause.field;
    const fieldMeta = FIELDS[field];
    let filter;
    // HACK: special search that requires custom query build
    if (field === 'quality') {
      filter = _qualityFilterBuilder(clause);
      translatedFilters.push(filter);
    } else if (fieldMeta.type === FIELD_TYPES.RANGED || fieldMeta.type === FIELD_TYPES.DATE) {
      filter = _rangeBuilder(clause);
      translatedFilters.push(filter);
    } else if (fieldMeta.type === FIELD_TYPES.NORMAL) {
      filter = _termsBuilder(clause);
      translatedFilters.push(filter);
    } else if (fieldMeta.type === FIELD_TYPES.REGEXP) {
      filter = _regexBuilder(clause);
      translatedFilters.push(filter);
    }
  });
  return translatedFilters;
};

/**
 * Build query for general filter types (terms, range, fuzzy)
 * @params clauses{}   array of clauses
 * */
const buildFilters = (clauses) => {
  if (_.isEmpty(clauses)) {
    return {
      bool: {
        filter: [
          {
            match_all: {}
          }
        ]
      }
    };
  }
  const translatedFilters = _translateFilters(clauses);
  const result = {
    bool: {
      filter: translatedFilters
    }
  };
  return result;
};

/**
 * Build query for nested fields
 * @params clauses{}   array of clauses
 * */
const buildNestedFilters = (clauses, nestedPath) => {
  if (_.isEmpty(clauses)) return null;
  const translatedFilters = _translateFilters(clauses);
  const result = {
    nested: {
      path: nestedPath,
      query: translatedFilters
    }
  };
  return result;
};

const buildQuery = (filters) => {
  const clauses = _.get(filters, 'clauses') || [];
  const enableClause = clauses.find(clause => clause && clause.field === 'enable');
  const filterClauses = levelFilter(clauses, FIELD_LEVELS.STATEMENT);
  const nestedEvidenceClauses = levelFilter(clauses, FIELD_LEVELS.EVIDENCE);
  const enableFilters = buildEnableFilters(enableClause);
  const generalFilters = buildFilters(filterClauses);
  const nestedEvidenceFilters = buildNestedFilters(nestedEvidenceClauses, NESTED_FIELD_PATHS.EVIDENCE);

  const allFilters = [
    enableFilters,
    generalFilters
  ];
  if (nestedEvidenceFilters != null) allFilters.push(nestedEvidenceFilters);
  return {
    query: {
      bool: {
        filter: allFilters
      }
    }
  };
};

module.exports = { buildQuery, buildFilters, levelFilter };
