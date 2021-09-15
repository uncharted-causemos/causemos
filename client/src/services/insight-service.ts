import API from '@/api/api';
import { Insight } from '@/types/Insight';
import _ from 'lodash';

// FIXME: the following filter fields are also used when fetching questions, rename accordingly
export interface InsightFilterFields {
  project_id?: string;
  context_id?: string;
  visibility?: string;
  target_view?: string;
  analysis_id?: string;
}

export const getInsightById = async (insight_id: string) => {
  const result = await API.get(`insights/${insight_id}`);
  return result.data;
};

export const addInsight = async (insight: Insight) => {
  const result = await API.post('insights', insight);
  return result;
};

export const updateInsight = async (insight_id: string, insight: Insight) => {
  const result = await API.put(`insights/${insight_id}`, insight, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return result.data;
};

export const deleteInsight = async (id: string) => {
  const result = await API.delete(`insights/${id}`);
  return result;
};

//
// Core fetch functions
//

/**
 * Fetch insights for a given array of fetch parameters
 * @param fetchParamsArray an array where each element is a combination of filter fields
 * @returns the result is a unique flat array with a union of all fetch operations
 */
export const fetchInsights = async (fetchParamsArray: InsightFilterFields[]) => {
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
  const promises = fetchParamsArray.map((fetchParams) => {
    return API.get('insights', { params: fetchParams });
  });
  // wait until all promises are resolved
  const allRawResponses = await Promise.all(promises);
  const allFlatResults = allRawResponses.flatMap(res => res.data);

  return _.uniqBy(allFlatResults, 'id');
};
