const _ = require('lodash');
const { FIELDS, FIELD_LEVELS, NESTED_FIELD_PATHS } = require('./datacube-config');
const { QueryUtil } = require('./query-util');

class DatacubeQueryUtil extends QueryUtil {
  constructor() {
    super(FIELDS);
  }

  buildQuery (filters) {
    const clauses = _.get(filters, 'clauses') || [];
    const filterClauses = this.levelFilter(clauses, FIELD_LEVELS.DATACUBE);
    const nestedConceptClauses = this.levelFilter(clauses, FIELD_LEVELS.CONCEPTS);
    const generalFilters = this.buildFilters(filterClauses);
    const nestedConceptFilters = this.buildNestedFilters(nestedConceptClauses, NESTED_FIELD_PATHS.CONCEPTS);

    const allFilters = [generalFilters];
    if (nestedConceptFilters != null) allFilters.push(nestedConceptFilters);
    return {
      query: {
        bool: {
          filter: allFilters
        }
      }
    };
  }
}

module.exports = { DatacubeQueryUtil };
