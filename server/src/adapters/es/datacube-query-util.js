const _ = require('lodash');
const { FIELDS, FIELD_LEVELS, NESTED_FIELD_PATHS } = require('./datacube-config');
const { QueryUtil } = require('./query-util');

class DatacubeQueryUtil extends QueryUtil {
  constructor() {
    super(FIELDS);
  }

  buildQuery (filters) {
    const clauses = _.get(filters, 'clauses') || [];
    const enableClause = clauses.find(clause => clause && clause.field === 'enable');
    const filterClauses = this.levelFilter(clauses, FIELD_LEVELS.DATACUBE);
    const nestedConceptClauses = this.levelFilter(clauses, FIELD_LEVELS.CONCEPTS);
    const enableFilters = this.buildEnableFilters(enableClause);
    const generalFilters = this.buildFilters(filterClauses);
    const nestedConceptFilters = this.buildNestedFilters(nestedConceptClauses, NESTED_FIELD_PATHS.CONCEPTS);

    const allFilters = [
      enableFilters,
      generalFilters
    ];
    if (nestedConceptFilters != null) allFilters.push(nestedConceptFilters);
    return {
      query: {
        bool: {
          filter: allFilters
        }
      }
    };
  }

  /**
   * query builder to filter at the global (index) level
   *
   * By default:
   *   * only return docs with is_hidden: false
   *
   * @params clause{}  enable clause object
   * */
  buildEnableFilters(clause) {
    const values = _.get(clause, 'values', []);
    const queries = [];
    if (values.indexOf('hidden') < 0) {
      queries.push({
        bool: {
          should: [
            {
              term: { is_hidden: false }
            },
            {
              bool: {
                must_not: {
                  exists: {
                    field: 'is_hidden'
                  }
                }
              }
            }
          ]
        }
      });
    }
    const result = {
      bool: {
        filter: queries
      }
    };
    return result;
  }
}

module.exports = { DatacubeQueryUtil };
