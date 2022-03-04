import API from '@/api/api';
import { Insight } from '@/types/Insight';

// This defines the fields in ES that you can filter by
export interface InsightFilterFields {
  id?: string[]; // allows searching by multiple IDs
  project_id?: string;
  context_id?: string;
  visibility?: string;
  target_view?: string;
  analysis_id?: string;
}

export const getInsightById = async (insight_id: string, fieldAllowList?: string[]) => {
  const result = await API.get(`insights/${insight_id}`, { params: { fieldAllowList } });
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


export const countInsights = async (fetchParams: InsightFilterFields): Promise<number> => {
  const filters = _fetchParamsToFilters(fetchParams);
  const { data } = await API.get('insights/count', { params: { filters: JSON.stringify(filters) } });
  return data;
};

/**
 * Fetch insights using the specified filter parameters
 * @param fetchParams an object of field-value pairs to filter by
 */
export const fetchInsights = async (fetchParams: InsightFilterFields): Promise<Insight[]> => {
  const options = {
    excludes: [
      'thumbnail',
      'annotation_state'
    ]
  };
  return await _fetchInsights(fetchParams, options);
};

/**
 * Fetch insights using the specified filter parameters, only the fields
 * specified in the allowList will be available
 * @param fetchParams an object of field-value pairs to filter by
 * @param allowList a list of fields to return
 */
export const fetchPartialInsights = async (fetchParams: InsightFilterFields, allowList: string[]): Promise<any[]> => {
  const options = {
    includes: allowList
  };
  return await _fetchInsights(fetchParams, options);
};

/**
 * Fetch the first insight using the specified filter parameters
 * @param fetchParams an object of field-value pairs to filter by
 */
export const getFirstInsight = async (fetchParams: InsightFilterFields): Promise<Insight | undefined> => {
  const options = {
    excludes: [
      'thumbnail',
      'annotation_state'
    ],
    size: 1
  };
  const insights = await _fetchInsights(fetchParams, options);
  return insights.length > 0 ? insights[0] : undefined;
};


const _fetchInsights = async (fetchParams: InsightFilterFields, options: any) => {
  const filters = _fetchParamsToFilters(fetchParams);
  const { data } = await API.get('insights', {
    params: {
      filters: JSON.stringify(filters),
      options
    }
  });
  return data;
};

const _fetchParamsToFilters = (fetchParams: InsightFilterFields) => {
  return Object.keys(fetchParams)
    .map(field => ({ field: field, value: (fetchParams as any)[field] }))
    .filter(f => f.value !== undefined && f.value !== null);
};
