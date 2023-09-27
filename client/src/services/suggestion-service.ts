import _ from 'lodash';

import API from '@/api/api';
import datacubeService from '@/services/datacube-service';
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

export default {
  getDatacubeFieldSuggestionFunction,
};
