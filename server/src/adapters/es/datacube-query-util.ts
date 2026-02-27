import _ from 'lodash';
import { FIELDS, FIELD_LEVELS, NESTED_FIELD_PATHS } from './datacube-config';
import { QueryUtil } from './query-util';

export class DatacubeQueryUtil extends QueryUtil {
  constructor() {
    super(FIELDS);
  }

  // @override
  _regexBuilder(clause: any): any {
    const { field, values } = clause;

    if (field !== 'keyword') {
      return super._regexBuilder(clause);
    }

    const queries: any[] = [];
    for (const value of values) {
      let queryStr = '';
      const tokens = value.split(' ');
      if (tokens.length > 1) {
        const boostedTokens = tokens.map((str: string, i: number) => `${str}^${tokens.length - i}`);
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
            'name^4',
            'family_name^2',
            'parameters.display_name^2',
            'outputs.display_name^12',
            'qualifier_outputs.display_name^2',
            'description^2',
            'parameters.description^2',
            'outputs.description^3',
            'qualifier_outputs.description^2',
            'geography.country',
            'geography.admin1',
            'geography.admin2',
            'geography.admin3',
            'category',
            'domains',
            'maintainer.name',
            'maintainer.organization',
            'tags',
          ],
        },
      });
    }
    return { bool: { should: queries } };
  }

  buildQuery(filters: any): any {
    const clauses = _.get(filters, 'clauses') || [];
    const enableClause = clauses.find((clause: any) => clause && clause.field === 'enable');
    const filterClauses = this.levelFilter(clauses, FIELD_LEVELS.DATACUBE);
    const nestedConceptClauses = this.levelFilter(clauses, FIELD_LEVELS.CONCEPTS);
    const enableFilters = this.buildEnableFilters(enableClause);
    const generalFilters = this.buildFilters(filterClauses);
    const nestedConceptFilters = this.buildNestedFilters(
      nestedConceptClauses,
      NESTED_FIELD_PATHS.CONCEPTS
    );

    const allFilters = [enableFilters, generalFilters];
    if (nestedConceptFilters != null) allFilters.push(nestedConceptFilters);
    return { query: { bool: { must: allFilters } } };
  }

  buildEnableFilters(clause: any): any {
    const values = _.get(clause, 'values', []);
    const queries: any[] = [];
    if (values.indexOf('hidden') < 0) {
      queries.push({
        bool: {
          should: [
            { term: { is_hidden: false } },
            { bool: { must_not: { exists: { field: 'is_hidden' } } } },
          ],
        },
      });
    }
    return { bool: { filter: queries } };
  }
}
