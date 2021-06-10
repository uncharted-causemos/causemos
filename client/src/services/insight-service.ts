import API from '@/api/api';
import { Insight } from '@/types/Insight';
import _ from 'lodash';

/**
 * Get all insights
 *  - insights associated with current project
 *    (private project-specific)
 *  - insights that are public
 *    (saved during model publication flow AND are associated with a specific model)
 */
export const getAllInsights = async (project_id: string, model_id: string) => {
  // first, fetch all insights related to the current project
  const fetchParams1 = {
    project_id
  };
  const insights1 = (await API.get('insights', { params: fetchParams1 })).data;
  const result1: Insight[] = _.orderBy(insights1, d => d.modified_at, ['desc']);

  // second, fetch all insights related to the currently selected model
  // NOTE: public insights from any/all models are not currently returned by this call
  const fetchParams2 = {
    model_id,
    visibility: 'public'
  };
  const insights2 = (await API.get('insights', { params: fetchParams2 })).data;
  const result2: Insight[] = _.orderBy(insights2, d => d.modified_at, ['desc']);

  // merge results1 and result2 to avoid duplication
  const listBookmarks = _.unionBy(result1, result2, 'id');

  return listBookmarks;
};

/**
 * Get context-sensitive (local) insights
 * - insights associated with the current project, match the current view,
 *   as well as the current context-id (e.g. selected datacube/model/cag/indicator)
 * - insights that are public
*    (saved during model publication flow AND are associated with a specific model AND match target view)
 */
export const getInsights = async (project_id: string, model_id: string, target_view: string) => {
  const fetchParams = {
    project_id,
    model_id,
    target_view
  };
  const insights1 = (await API.get('insights', { params: fetchParams })).data;
  const result1: Insight[] = _.orderBy(insights1, d => d.modified_at, ['desc']);

  // second, fetch all insights related to the current model (i.e., published model insights)
  //  those won't have valid project so the visibility flag will get all of them,
  //   and then match against current view and context (or model) id
  const fetchParams2 = {
    model_id,
    target_view,
    visibility: 'public'
  };
  const insights2 = (await API.get('insights', { params: fetchParams2 })).data;
  const result2: Insight[] = _.orderBy(insights2, d => d.modified_at, ['desc']);

  // merge results1 and result2 to avoid duplication
  const listBookmarks = _.unionBy(result1, result2, 'id');

  return listBookmarks;
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
