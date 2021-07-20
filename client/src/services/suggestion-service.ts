import _ from 'lodash';

import API from '@/api/api';
import modelService from '@/services/model-service';
import datacubeService from '@/services/new-datacube-service';

/**
 * Returns a throttled function that can be used to fetch concept suggestions from ES.
 * Typically, you would pass the suggestion function into a lex search pill.
 * @param {string} projectId - project id
 * @param {array<string>} ontology - ontology
 * @param {function(array<string>, string): array<string>} [postProcessFn] - optional processing on the fetched suggestions
 * @returns {DebouncedFunc<function(*=): Promise<*>>} a function used to fetch suggestions
 */
const getConceptSuggestionFunction = (projectId: string, ontology: Array<string>, postProcessFn?: Function) => {
  return _.debounce(async function(hint = '') {
    let result = ontology;
    if (!_.isEmpty(hint)) {
      const suggestions = await modelService.getConceptSuggestions(projectId, hint, ontology);
      result = suggestions.map(s => s.concept);
    }
    if (postProcessFn) {
      return postProcessFn(result, hint);
    }
    return result;
  }, 500, { trailing: true, leading: true });
};

/**
 * Returns a throttled function that can be used to fetch suggestions from ES for the provided field.
 * Typically, you would pass the suggestion function into a lex search pill.
 *
 * For concept suggestions, {@see getConceptSuggestionFunction} should be used instead.
 * For datacube suggestions, {@see getDatacubeSuggestionFunction} should be used instead.
 * @param {string} projectId - project id
 * @param {string} field - the ES field to get suggestions for
 * @param {function(array<string>, string): array<string>} [postProcessFn] - optional processing on the fetched suggestions
 * @returns {DebouncedFunc<function(*=): Promise<*>>} a function used to fetch suggestions
 */
const getSuggestionFunction = (projectId: string, field: string, postProcessFn?: Function) => {
  return _.debounce(async function(hint = '') {
    let result = [];
    if (!_.isEmpty(hint)) {
      result = await modelService.getSuggestions(projectId, field, hint);
    }
    if (postProcessFn) {
      return postProcessFn(result, hint);
    }
    return result;
  }, 500, { trailing: true, leading: true });
};

/**
 * Returns a throttled function that can be used to fetch suggestions for datacube fields
 * from ES by searching the provided datacube field.
 * Typically, you would pass the suggestion function into a lex search pill.
 *
 * @param {string} field - the ES field to get suggestions for
 * @param {function(array<string>, string): array<string>} [postProcessFn] - optional processing on the fetched suggestions
 * @returns {DebouncedFunc<function(*=): Promise<*>>} a function used to fetch suggestions
 */
const getDatacubeSuggestionFunction = (field: string, postProcessFn?: Function) => {
  return _.debounce(async function(hint = '') {
    let result = [];
    if (!_.isEmpty(hint)) {
      result = await datacubeService.getSuggestions(field, hint);
    }
    if (postProcessFn) {
      return postProcessFn(result, hint);
    }
    return result;
  }, 500, { trailing: true, leading: true });
};

// Find indirect paths between source/target
const getPathSuggestions = async (projectId: string, source: string, target: string) => {
  const payload = { source, target };
  const result = await API.get(`projects/${projectId}/path-suggestions`, { params: payload });
  return result.data;
};

export default {
  getConceptSuggestionFunction,
  getSuggestionFunction,
  getDatacubeSuggestionFunction,
  getPathSuggestions
};
