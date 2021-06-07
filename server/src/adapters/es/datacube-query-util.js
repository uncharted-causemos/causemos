const _ = require('lodash');
const { FIELDS, FIELD_TYPES, FIELD_LEVELS, NESTED_FIELD_PATHS } = require('./datacube-config');

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
    if (fieldMeta.type === FIELD_TYPES.RANGED || fieldMeta.type === FIELD_TYPES.DATE) {
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
  const filterClauses = levelFilter(clauses, FIELD_LEVELS.DATACUBE);
  const nestedConceptClauses = levelFilter(clauses, FIELD_LEVELS.CONCEPTS);
  const generalFilters = buildFilters(filterClauses);
  const nestedConceptFilters = buildNestedFilters(nestedConceptClauses, NESTED_FIELD_PATHS.CONCEPTS);

  const allFilters = [generalFilters];
  if (nestedConceptFilters != null) allFilters.push(nestedConceptFilters);
  return {
    query: {
      bool: {
        filter: allFilters
      }
    }
  };
};

module.exports = { buildQuery, buildFilters, levelFilter };
