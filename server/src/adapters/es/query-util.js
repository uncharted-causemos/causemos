const _ = require('lodash');
const { FIELD_TYPES } = require('./config');
const moment = require('moment');

class QueryUtil {
  constructor(fields) {
    this.configFields = fields;
  }

  /**
   * terms search fields query builder
   * @param {Object} clause clause object
   * @param {String} clause.field clause field name
   * @param {Array}  clause.values clause values
   * @param {String} clause.operand clause operand
   * @param {Boolean} clause.isNot clause negative search
   */
  _termsBuilder(clause) {
    const { field, values } = clause;
    const esFields = this.configFields[field].aggFields || this.configFields[field].fields;
    const result = esFields.map((field) => {
      return { terms: { [field]: values } };
    });

    if (clause.isNot === true) {
      return {
        bool: {
          must_not: result,
        },
      };
    }
    return {
      bool: {
        should: result,
      },
    };
  }

  /**
   * range query builder
   * @param {Object} clause clause object
   * @param {String} clause.field clause field name
   * @param {Array}  clause.values clause values
   * @param {String} clause.operand clause operand
   * @param {Boolean} clause.isNot clause negative search
   */
  _rangeBuilder(clause) {
    const { field, values } = clause;
    const fieldMeta = this.configFields[field];
    const esFields = fieldMeta.fields;
    const queries = [];

    esFields.forEach((esField) => {
      values.forEach((range) => {
        const resultRange = {};
        if (range[0] !== '--') {
          resultRange.gte = range[0];
        }
        if (range[1] !== '--') {
          resultRange.lt = range[1];
        }
        queries.push({
          range: {
            [esField]: resultRange,
          },
        });
      });
    });
    if (clause.isNot === true) {
      return {
        bool: {
          must_not: queries,
        },
      };
    }
    return {
      bool: {
        should: queries,
      },
    };
  }

  /**
   * converts the values in the clause object from YYYY-MM-DD to epoch_millis
   * @param {Object} clause clause object
   * @param {String} clause.field clause field name
   * @param {Array}  clause.values clause values
   * @param {String} clause.operand clause operand
   * @param {Boolean} clause.isNot clause negative search
   */
  _dateToEpochMillis(clause) {
    const { values } = clause;
    values.forEach((range) => {
      if (range[0] !== '--') {
        range[0] = moment.utc(range[0].toString()).valueOf();
      }
      if (range[1] !== '--') {
        range[1] = moment.utc(range[1].toString()).valueOf();
      }
    });
    return clause;
  }

  /**
   * Wildcard builder
   * @param {Object} clause
   *
   */
  _regexBuilder(clause) {
    const { field, values } = clause;
    const fieldMeta = this.configFields[field];
    const esFields = fieldMeta.fields;
    const queries = [];
    esFields.forEach((field) => {
      values.forEach((value) => {
        queries.push({
          query_string: {
            // case insensitive search
            query: `${value}*`,
            fields: [field],
            default_operator: 'AND',
          },
        });
      });
    });
    if (clause.isNot === true) {
      return {
        bool: {
          must_not: queries,
        },
      };
    }
    return {
      bool: {
        should: queries,
      },
    };
  }

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
  _qualityFilterBuilder(clause) {
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
          filter: [{ term: { 'wm.edited': 0 } }, { term: { 'wm.state': 1 } }],
        },
      });
    }

    if (clause.isNot === true) {
      return {
        bool: {
          must_not: queries,
        },
      };
    }

    return {
      bool: {
        should: queries,
      },
    };
  }

  /**
   * Checks whether the clause received is valid
   * See test for example
   * @param {Object} clause clause object
   * @param {String} clause.field clause field name
   * @param {Array}  clause.values clause values
   * @param {String} clause.operand clause operand
   * @param {Boolean} clause.isNot clause negative search
   */
  _validClauseCheck(clause) {
    const { values } = clause;
    if (!_.isArray(values)) {
      throw new Error('Value must be array');
    }
  }

  /**
   * filters out filter clauses by nested level
   * @param {Array} clauses
   * @param {Integer} documentLevel
   */
  levelFilter(clauses, documentLevel) {
    const result = clauses.filter((clause) => {
      let fieldType;
      if (!_.isNil(clause)) {
        const fieldMeta = this.configFields[clause.field];
        fieldType = fieldMeta.level;
      }
      return fieldType === documentLevel;
    });
    return result;
  }

  /**
   * Translate general filter type clauses (terms, range, fuzzy) to ES queries
   * @params clauses{}   array of clauses
   * */
  _translateFilters(clauses) {
    const translatedFilters = [];
    clauses.forEach((clause) => {
      this._validClauseCheck(clause);
      const field = clause.field;
      const fieldMeta = this.configFields[field];
      let filter;
      if (fieldMeta.type === FIELD_TYPES._QUALITY) {
        // HACK: special search that requires custom query build
        filter = this._qualityFilterBuilder(clause);
        translatedFilters.push(filter);
      } else if (fieldMeta.type === FIELD_TYPES.RANGED || fieldMeta.type === FIELD_TYPES.DATE) {
        filter = this._rangeBuilder(clause);
        translatedFilters.push(filter);
      } else if (fieldMeta.type === FIELD_TYPES.DATE_MILLIS) {
        filter = this._rangeBuilder(this._dateToEpochMillis(clause));
        translatedFilters.push(filter);
      } else if (fieldMeta.type === FIELD_TYPES.NORMAL) {
        filter = this._termsBuilder(clause);
        translatedFilters.push(filter);
      } else if (fieldMeta.type === FIELD_TYPES.REGEXP) {
        filter = this._regexBuilder(clause);
        translatedFilters.push(filter);
      }
    });
    return translatedFilters;
  }

  /**
   * Build query for general filter types (terms, range, fuzzy)
   * @params clauses{}   array of clauses
   * */
  buildFilters(clauses) {
    if (_.isEmpty(clauses)) {
      return {
        bool: {
          filter: [
            {
              match_all: {},
            },
          ],
        },
      };
    }
    const translatedFilters = this._translateFilters(clauses);
    const result = {
      bool: {
        must: translatedFilters,
      },
    };
    return result;
  }

  /**
   * Build query for nested fields
   * @params clauses{}   array of clauses
   * */
  buildNestedFilters(clauses, nestedPath) {
    if (_.isEmpty(clauses)) return null;
    const translatedFilters = this._translateFilters(clauses);
    const result = {
      nested: {
        path: nestedPath,
        query: translatedFilters,
      },
    };
    return result;
  }
}

module.exports = { QueryUtil };
