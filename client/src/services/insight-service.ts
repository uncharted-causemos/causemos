import API from '@/api/api';
import _ from 'lodash';

const getParamsForAllInsightsFetch = (project_id: string, model_id: string) => {
  return [
    // first, fetch all insights related to the current project
    {
      project_id
    },
    // second, fetch all public insights related to the currently selected model
    {
      model_id,
      visibility: 'public'
    }
  ];
};

const getParamsForLocalInsightsFetch = (project_id: string, model_id: string, target_view: string) => {
  return [
    // first, fetch all insights related to the current project, filtered for current view
    {
      project_id,
      model_id,
      target_view
    },
    // second, fetch all insights related to the current model (i.e., published model insights)
    //  those won't have valid project so the visibility flag will get all of them,
    //   and then match against current view and context (or model) id    {
    {
      model_id,
      target_view,
      visibility: 'public'
    }
  ];
};

/**
 * Fetch insights for a given array of fetch parameters
 * @param fetchParamsArray an array where each element is a combination of filter fields
 * @returns the result is a unique flat array with a union of all fetch operations
 */
const fetchInsights = async (fetchParamsArray: any[]) => {
  // this sequential async loop works
  /*
  const allResults: Insight[] = [];
  for (const fetchParams of fetchParamsArray) {
    const insights = (await API.get('insights', { params: fetchParams })).data;
    const orderedInsights: Insight[] = _.orderBy(insights, d => d.modified_at, ['desc']);
    allResults.push(...orderedInsights);
  }
  */

  // but we may also run the loop in parallel; map the array to promises
  const promises = fetchParamsArray.map(async (fetchParams) => {
    return API.get('insights', { params: fetchParams });
  });
  // wait until all promises are resolved
  const allRawResponses = await Promise.all(promises);
  const allFlatResults = allRawResponses.flatMap(res => res.data);

  return _.uniqBy(allFlatResults, 'id');
};

/**
 * Get all insights
 *  - insights associated with current project
 *    (private project-specific)
 *  - insights that are public
 *    (saved during model publication flow AND are associated with a specific model)
 */
export const getAllInsights = async (project_id: string, model_id: string) => {
  const fetchParamsArray = getParamsForAllInsightsFetch(project_id, model_id);
  return fetchInsights(fetchParamsArray);
};

/**
 * Get context-sensitive (local) insights
 * - insights associated with the current project, match the current view,
 *   as well as the current context-id (e.g. selected datacube/model/cag/indicator)
 * - insights that are public
*    (saved during model publication flow AND are associated with a specific model AND match target view)
 */
export const getInsights = async (project_id: string, model_id: string, target_view: string) => {
  const fetchParamsArray = getParamsForLocalInsightsFetch(project_id, model_id, target_view);
  return fetchInsights(fetchParamsArray);
};

/**
 * @param project_id project id
 * @returns the a promise with a result holding the total count of insight for a given project ID
 * FIXME: should have a variant for fetching all insights, or only local insights
 */
export const getInsightsCount = async (project_id: string) => {
  return API.get('insights/counts', {
    params: { project_id }
  });
};

export default {
  getInsights,
  getAllInsights,
  getInsightsCount
};
