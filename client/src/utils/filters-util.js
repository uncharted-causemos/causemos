import _ from 'lodash';
import { CODE_TABLE } from '@/utils/code-util';
import ConceptUtil from '@/utils/concept-util';
/**
 * Constructs search queries to pass through the API.
 *
 * Queries are made of 3 parts:
 * - filters: filters data
 * - pageStart/pageLimit: pagination
 * - orderBy: sort options
 *
 * Filters consist of an array of sub-filters, each of which are expected to define these attributes
 * - field: the logical-field to filter
 * - values: an array of matching values
 * - operand: specifies either 'and' or 'or' operations
 * - isNot: specifies whether the sub-filter should be negated, expect true|false
 *
 * Note: Currently there is a 'clauses' object, used to get around encoding issues. This is subjected
 * to change and so "clauses" should not be exposed outside of this module.
 *
*/

/**
 * Filters object.
 * @typedef {Object} Filters
 * @property {Filter[]} clauses - A list of filters
 */

/**
  * A filter object
  * @typedef {Object} Filter
  * @property {string} field - the logical-field to filter
  * @property {string[]|number[]} values - an array of matching values
  * @property {string} operand -  specifies either 'and' or 'or' operations
  * @property {boolean} isNot - specifies whether the sub-filter should be negated, expect true|false
  */

/**
 * Custom equality to check if two filters are the same, this is needed
 * as the clauses is an array of object and in some cases we cannot ensure
 * order.
 *
 * @param {Filters} a - first filter
 * @param {Filters} b - second filters
 */
function isEqual(a, b) {
  if (isEmpty(a) && isEmpty(b)) return true;
  if (a.clauses.length !== b.clauses.length) return false;

  for (let i = 0; i < a.clauses.length; i++) {
    const aClause = a.clauses[i];
    const foundItem = b.clauses.find(bClause => {
      return _.isEqual(aClause, bClause);
    });
    if (_.isNil(foundItem)) return false;
  }
  return true;
}

/**
 * Custom equality to check if clause in two different filters are the same,
 * this is needed as we sometimes care if only a specific clause in filter has updated and
 * don't care about updates that occur to rest of the clauses
 *
 * @param {Filters} a - first filter
 * @param {Filters} b - second filters
 * @param {string} field - field name
 * @param {boolean} isNot
 */
function isClauseEqual(a, b, field, isNot) {
  const aClause = _.find(a.clauses, clause => {
    return clause.field === field && clause.isNot === isNot;
  });
  const bClause = _.find(b.clauses, clause => {
    return clause.field === field && clause.isNot === isNot;
  });
  return _.isEqual(aClause, bClause);
}

function findPositiveFacetClause(filters, field) {
  return _.find(filters.clauses, clause => {
    return clause.field === field && clause.isNot === false;
  });
}

function findNegativeFacetClause(filters, field) {
  return _.find(filters.clauses, clause => {
    return clause.field === field && clause.isNot === true;
  });
}

function isInterventionQuery(filters) {
  return filters.clauses.some(value => {
    return value.field === CODE_TABLE.INTERVENTION_PATH.field ||
      value.field === CODE_TABLE.INTERVENTION.field ||
      (value.field === CODE_TABLE.TOPIC.field && value.values.some(v => ConceptUtil.isInterventionNode(v)));
  });
}

function addSearchTerm(filters, field, term, operand, isNot) {
  const existingClause = _.find(filters.clauses, clause => {
    return clause.field === field &&
      clause.operand === operand &&
      clause.isNot === isNot;
  });

  if (!_.isNil(existingClause)) {
    existingClause.values.push(term);
  } else {
    filters.clauses.push({
      field: field,
      operand: operand,
      isNot: isNot,
      values: [term]
    });
  }
}


function removeSearchTerm(filters, field, term, operand, isNot) {
  const existingClause = _.find(filters.clauses, clause => {
    return clause.field === field &&
      clause.operand === operand &&
      clause.isNot === isNot;
  });

  if (!_.isNil(existingClause)) {
    _.remove(existingClause.values, v => {
      return _.isEqual(v, term);
    });

    // If now empty remove clause
    if (_.isEmpty(existingClause.values)) {
      _.remove(filters.clauses, clause => {
        return clause.field === field &&
          clause.operand === operand &&
          clause.isNot === isNot;
      });
    }
  }
}

function removeClause(filters, field, operand, isNot) {
  _.remove(filters.clauses, clause => {
    return clause.field === field &&
      clause.operand === operand &&
      clause.isNot === isNot;
  });
}

function removeAllClausesByFacet(filters, field) {
  _.remove(filters.clauses, clause => {
    return clause.field === field;
  });
}


function setClause(filters, field, values, operand, isNot) {
  removeClause(filters, field, operand, isNot);

  if (!_.isEmpty(values)) {
    filters.clauses.push({
      field: field,
      operand: operand,
      isNot: isNot,
      values: values
    });
  }
}

function isEmpty(filters) {
  return _.isEmpty(filters) || _.isEmpty(filters.clauses);
}

function isEmptyClause(clause) {
  return _.isEmpty(clause) || _.isEmpty(clause.values);
}

/**
 * @returns {Filters}
 */
function newFilters() {
  return { clauses: [] };
}


export default {
  findPositiveFacetClause,
  findNegativeFacetClause,
  addSearchTerm,
  removeSearchTerm,
  isEmpty,
  isEmptyClause,
  newFilters,
  removeClause,
  removeAllClausesByFacet,
  setClause,
  isEqual,
  isInterventionQuery,
  isClauseEqual
};
