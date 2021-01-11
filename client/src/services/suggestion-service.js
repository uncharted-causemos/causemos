import _ from 'lodash';

import modelService from '@/services/model-service';

/**
 * Returns a throttled function that can be used to fetch concept suggestions from ES.
 * Typically, you would pass the suggestion function into a lex search pill.
 * @param {string} projectId - project id
 * @param {array<string>} ontology - ontology
 * @param {function(array<string>): array<string>} [postProcessFn] - optional processing on the fetched suggestions
 * @returns {DebouncedFunc<function(*=): Promise<*>>} a function used to fetch suggestions
 */
const getConceptSuggestionFunction = (projectId, ontology, postProcessFn) => {
  return _.debounce(async function(hint = '') {
    let result = ontology;
    if (!_.isEmpty(hint)) {
      const suggestions = await modelService.getConceptSuggestions(projectId, hint, ontology);
      result = suggestions.map(s => s.concept);
    }
    if (postProcessFn) {
      return postProcessFn(result);
    }
    return result;
  }, 500, { trailing: true, leading: true });
};

/**
 * Returns a throttled function that can be used to fetch suggestions from ES for the provided field.
 * Typically, you would pass the suggestion function into a lex search pill.
 *
 * For concept suggestions, {@see getConceptSuggestionFunction} should be used instead.
 * @param {string} projectId - project id
 * @param {string} field - the ES field to get suggestions for
 * @param {function(array<string>): array<string>} [postProcessFn] - optional processing on the fetched suggestions
 * @returns {DebouncedFunc<function(*=): Promise<*>>} a function used to fetch suggestions
 */
const getSuggestionFunction = (projectId, field, postProcessFn) => {
  return _.debounce(async function(hint = '') {
    let result = [];
    if (!_.isEmpty(hint)) {
      result = await modelService.getSuggestions(projectId, field, hint);
    }
    if (postProcessFn) {
      return postProcessFn(result);
    }
    return result;
  }, 500, { trailing: true, leading: true });
};

export default {
  getConceptSuggestionFunction,
  getSuggestionFunction
};
