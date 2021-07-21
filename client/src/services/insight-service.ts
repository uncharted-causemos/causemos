import API from '@/api/api';
import { Insight } from '@/types/Insight';
import _ from 'lodash';

// FIXME: add support for analysisId field

//
// Filter fields
//

// example: get all insights related to a given project
//  if a target-view and/or context-id is provided then the result will be filtered accordingly

const getProjectSpecificFilterFields = (project_id: string, context_id?: string, target_view?: string) => {
  return {
    project_id,
    context_id,
    target_view
  };
};

// example: return all public insights that were created during DSSAT publication
//  if a target-view is provided then the result will be filtered against current view
const getPublishedModelFilterFields = (context_id: string, target_view?: string) => {
  return {
    context_id,
    visibility: 'public',
    target_view
  };
};

const getParamsForAllInsightsFetch = (project_id: string, context_id: string) => {
  return [
    // first, fetch all insights related to the current project
    getProjectSpecificFilterFields(project_id),
    // second, fetch all public insights related to the currently selected model
    getPublishedModelFilterFields(context_id)
  ];
};

const getParamsForContextSpecificInsightsFetch = (project_id: string, context_id: string, target_view: string) => {
  return [
    // first, fetch all insights related to the current project, and the currently loaded datacube/model-id, and filtered for current view
    getProjectSpecificFilterFields(project_id, context_id, target_view),
    // second, fetch all insights related to the current model (i.e., published model insights)
    //  those won't have valid project so the visibility flag will get all of them,
    //   and then match against current view and context (or model) id
    getPublishedModelFilterFields(context_id, target_view)
  ];
};

//
// Fetch insight list
//

/**
 * Get all insights
 *  - insights associated with current project
 *    (private project-specific)
 *  - insights that are public
 *    (saved during model publication flow AND are associated with a specific model)
 * @param project_id project id
 * @param context_id context id
 * @returns the list of all insights
 */
export const getAllInsights = async (project_id: string, context_id: string) => {
  const fetchParamsArray = getParamsForAllInsightsFetch(project_id, context_id);
  return fetchInsights(fetchParamsArray);
};

/** Get context-sensitive (local) insights
 * - insights associated with the current project, match the current view,
 *   as well as the current context-id (e.g. selected datacube/model/cag/indicator)
 * - insights that are public
 *   (saved during model publication flow AND are associated with a specific model AND match target view)
 * @param project_id project id
 * @param context_id context id
 * @param target_view target view
 * @returns the list of local (context-specific) insights
 */
export const getContextSpecificInsights = async (project_id: string, context_id: string, target_view: string) => {
  const fetchParamsArray = getParamsForContextSpecificInsightsFetch(project_id, context_id, target_view);
  return fetchInsights(fetchParamsArray);
};

//
// Fetch insight counts
//

/**
 * @param project_id project id
 * @param context_id context id
 * @param target_view target view
 * @returns the total count of local insights
 */
export const getSpecificInsightsCount = async (project_id: string, context_id: string, target_view: string) => {
  const fetchParamsArray = getParamsForContextSpecificInsightsFetch(project_id, context_id, target_view);
  return fetchInsightsCount(fetchParamsArray);
};

/**
 * @param project_id project id
 * @param context_id context id
 * @returns the total count of all insights
 */
export const getAllInsightsCount = async (project_id: string, context_id: string) => {
  const fetchParamsArray = getParamsForAllInsightsFetch(project_id, context_id);
  return fetchInsightsCount(fetchParamsArray);
};

export const getInsightById = async (insight_id: string) => {
  const result = await API.get(`insights/${insight_id}`);
  return result.data;
};

export const updateInsight = async (insight_id: string, insight: Insight) => {
  const result = await API.put(`insights/${insight_id}`, insight, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return result.data;
};

// TODO: add deleteInsight API

//
// Core fetch functions
//

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
 * Fetch insights for a given array of fetch parameters
 * @param fetchParamsArray an array where each element is a combination of filter fields
 * @returns the result is a unique flat array with a union of all fetch operations
 */
const fetchInsightsCount = async (fetchParamsArray: any[]) => {
  // but we may also run the loop in parallel; map the array to promises
  const promises = fetchParamsArray.map(async (fetchParams) => {
    return API.get('insights/counts', { params: fetchParams });
  });
  // wait until all promises are resolved
  const allRawResponses = await Promise.all(promises);
  const allFlatResults = allRawResponses.flatMap(res => res.data);
  return _.sum(allFlatResults);
};

export default {
  getContextSpecificInsights,
  getAllInsights,
  getSpecificInsightsCount,
  getAllInsightsCount,
  getInsightById
};
