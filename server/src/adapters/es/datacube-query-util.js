const _ = require('lodash');
const { FIELDS, FIELD_LEVELS, NESTED_FIELD_PATHS } = require('./datacube-config');
const { QueryUtil } = require('./query-util');

class DatacubeQueryUtil extends QueryUtil {
  constructor() {
    super(FIELDS);
  }

  // @override
  // Custom search for datacube: boost conjunction and specific field
  // e.g. if we have "water trucking" it becomes something like
  // "(water AND trucking)^2 OR (water OR trucking)", with field boosters on name and descriptions
  _regexBuilder(clause) {
    const { field, values } = clause;

    if (field !== 'keyword') {
      return super._regexBuilder(clause);
    }

    // const fieldMeta = this.configFields[field];
    // const esFields = fieldMeta.fields;
    //
    const queries = [];
    for (const value of values) {
      let queryStr = '';

      const tokens = value.split(' ');
      if (tokens.length > 1) {
        const boostedTokens = tokens.map((str, i) => `${str}^${tokens.length - i}`);
        const conjunctiveStr = `(${boostedTokens.join(' AND ')})^2`;
        const disjunctiveStr = `(${boostedTokens.join(' OR ')})`;
        queryStr = `${conjunctiveStr} OR ${disjunctiveStr}`;
      } else {
        queryStr = value;
      }

      queries.push({
        query_string: {
          query: queryStr,
          fields: [
            'name^2',
            'description^2',
            'family_name^2',
            'parameters.display_name^2',
            'outputs.display_name^10',

            'parameters.description',
            'outputs.description'
          ]
        }
      });
    }
    return {
      bool: {
        should: queries
      }
    };
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
          must: allFilters
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
