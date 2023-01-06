import _ from 'lodash';

import API from '@/api/api';
import projectService from '@/services/project-service';
import datacubeService from '@/services/new-datacube-service';
import { RegionalGADMDetail } from '@/types/Common';

/**
 * Returns a throttled function that can be used to fetch GADM suggestions from ES.
 * @param field geo level, e.g., country, admin1, admin2, etc.
 * @param query name of sub-name of the geo region to search for
 * @returns an array of regional info matching the query
 */
export const getGADMSuggestions = (field: string, query: string) => {
  return _.debounce(
    async () => {
      const result = await API.get('gadm/suggestions', { params: { field, q: query } });
      return result.data as Array<RegionalGADMDetail>;
    },
    300,
    { trailing: true, leading: true }
  );
};

/**
 * Returns a throttled function that can be used to fetch concept suggestions from ES.
 * Typically, you would pass the suggestion function into a lex search pill.
 * @param {string} projectId - project id
 * @param {array<string>} ontology - ontology
 * @param {function(array<string>, string): array<string>} [postProcessFn] - optional processing on the fetched suggestions
 * @returns {DebouncedFunc<function(*=): Promise<*>>} a function used to fetch suggestions
 */
const getConceptSuggestionFunction = (
  projectId: string,
  ontology: Array<string>,
  postProcessFn?: Function
) => {
  return _.debounce(
    async function (hint = '') {
      let result = ontology;
      if (!_.isEmpty(hint)) {
        const suggestions = await projectService.getConceptSuggestions(projectId, hint);
        result = suggestions.map((s: any) => s.doc.key);
      }
      if (postProcessFn) {
        return postProcessFn(result, hint);
      }
      return result;
    },
    500,
    { trailing: true, leading: true }
  );
};

/**
 * Returns a throttled function that can be used to fetch suggestions from ES for the provided field.
 * Typically, you would pass the suggestion function into a lex search pill.
 *
 * For concept suggestions, {@see getConceptSuggestionFunction} should be used instead.
 * For datacube suggestions, {@see getDatacubeFieldSuggestionFunction} should be used instead.
 * @param {string} projectId - project id
 * @param {string} field - the ES field to get suggestions for
 * @param {function(array<string>, string): array<string>} [postProcessFn] - optional processing on the fetched suggestions
 * @returns {DebouncedFunc<function(*=): Promise<*>>} a function used to fetch suggestions
 */
const getSuggestionFunction = (projectId: string, field: string, postProcessFn?: Function) => {
  return _.debounce(
    async function (hint = '') {
      let result = [];
      if (!_.isEmpty(hint)) {
        result = await projectService.getSuggestions(projectId, field, hint);
      }
      if (postProcessFn) {
        return postProcessFn(result, hint);
      }
      return result;
    },
    500,
    { trailing: true, leading: true }
  );
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
const getDatacubeFieldSuggestionFunction = (field: string, postProcessFn?: Function) => {
  return _.debounce(
    async function (hint = '') {
      let result = [];
      if (!_.isEmpty(hint)) {
        result = await datacubeService.getSuggestions(field, hint);
      }
      if (postProcessFn) {
        return postProcessFn(result, hint);
      }
      return result;
    },
    500,
    { trailing: true, leading: true }
  );
};

// Find indirect paths between source/target
const getPathSuggestions = async (projectId: string, source: string, target: string) => {
  const payload = { source, target };
  const result = await API.get(`projects/${projectId}/path-suggestions`, { params: payload });
  return result.data;
};

// Find indirect paths between sources/targets for merged nodes
const getGroupPathSuggestions = async (projectId: string, sources: string[], targets: string[]) => {
  const result = await API.post(`projects/${projectId}/group-path-suggestions`, {
    sources,
    targets,
  });
  return result.data;
};

export default {
  getConceptSuggestionFunction,
  getSuggestionFunction,
  getDatacubeFieldSuggestionFunction,
  getPathSuggestions,
  getGroupPathSuggestions,
};
