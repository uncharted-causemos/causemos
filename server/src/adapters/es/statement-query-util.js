const _ = require('lodash');
const { FIELDS, FIELD_LEVELS, NESTED_FIELD_PATHS } = require('./config');
const { QueryUtil } = require('./query-util');

class StatementQueryUtil extends QueryUtil {
  constructor() {
    super(FIELDS);
  }

  /**
   * query builder to filter at the global (index) level
   *
   * By default:
   *   * self-loops are disabled
   *   * staged and deleted states are hidden
   *
   * @params clause{}  enable clause object
   * */
  buildEnableFilters(clause) {
    const values = _.get(clause, 'values') || [];
    const queries = [];
    if (values.indexOf('self-loop') < 0) {
      queries.push({
        term: {
          'wm.is_selfloop': false,
        },
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
        'wm.state': states,
      },
    });
    const result = {
      bool: {
        filter: queries,
      },
    };
    return result;
  }

  buildQuery(filters) {
    const clauses = _.get(filters, 'clauses') || [];
    const enableClause = clauses.find((clause) => clause && clause.field === 'enable');
    const filterClauses = this.levelFilter(clauses, FIELD_LEVELS.STATEMENT);
    const nestedEvidenceClauses = this.levelFilter(clauses, FIELD_LEVELS.EVIDENCE);
    const enableFilters = this.buildEnableFilters(enableClause);
    const generalFilters = this.buildFilters(filterClauses);
    const nestedEvidenceFilters = this.buildNestedFilters(
      nestedEvidenceClauses,
      NESTED_FIELD_PATHS.EVIDENCE
    );

    const allFilters = [enableFilters, generalFilters];
    if (nestedEvidenceFilters != null) allFilters.push(nestedEvidenceFilters);
    return {
      query: {
        bool: {
          must: allFilters,
        },
      },
    };
  }
}

module.exports = { StatementQueryUtil };
