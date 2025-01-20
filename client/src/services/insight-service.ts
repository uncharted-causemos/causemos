import API from '@/api/api';
import { FullInsight, Insight, InsightMetadata, DataState, NewInsight } from '@/types/Insight';
import { isDataAnalysisState } from '@/utils/insight-util';

import { INSIGHTS } from '@/utils//messages-util';
import useToaster from '@/composables/useToaster';
import { TYPE } from 'vue-toastification';

// This defines the fields in ES that you can filter by
export interface InsightFilterFields {
  id?: string | string[]; // allows searching by multiple IDs
  project_id?: string;
  context_id?: string | string[];
  analysis_id?: string;
}

export const getInsightById = async (insight_id: string, fieldAllowList?: string[]) => {
  const result = await API.get(`insights/${insight_id}`, { params: { allowList: fieldAllowList } });
  return result.data;
};

export const addInsight = async (insight: FullInsight | NewInsight) => {
  const result = await API.post('insights', insight);
  return result;
};

// Alias to addInsight but it returns the data
export const createInsight = async (insight: FullInsight | NewInsight) => {
  const { data } = await API.post('insights', insight);
  return data as { id: string };
};

export const updateInsight = async (insight_id: string, insight: Partial<Insight | NewInsight>) => {
  const result = await API.put(`insights/${insight_id}`, insight, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return result.data;
};

export const deleteInsight = async (id: string) => {
  const result = await API.delete(`insights/${id}`);
  return result;
};

// ==================================================================

/**
 * Fetch insights using the specified filter parameters
 * @param fetchParams an object of field-value pairs to filter by
 */
export const fetchInsights = async (fetchParams: InsightFilterFields): Promise<Insight[]> => {
  const options = {
    excludes: ['thumbnail', 'image', 'annotation_state'],
    sort: [{ modified_at: { order: 'desc' } }],
  };
  return await _fetchInsights(fetchParams, options);
};

/**
 * Fetch full insights using the specified filter parameters
 * @param fetchParams an object of field-value pairs to filter by
 */
export const fetchFullInsights = async (
  fetchParams: InsightFilterFields,
  includeAnnotationState = false
): Promise<(FullInsight | NewInsight)[]> => {
  const excludes = ['thumbnail'];
  if (!includeAnnotationState) excludes.push('annotation_state');
  const options = {
    excludes,
    sort: [{ modified_at: { order: 'desc' } }],
  };
  return await _fetchInsights(fetchParams, options);
};

/**
 * Fetch insights using the specified filter parameters, only the fields
 * specified in the allowList will be available
 * @param fetchParams an object of field-value pairs to filter by
 * @param allowList a list of fields to return
 */
export const fetchPartialInsights = async (
  fetchParams: InsightFilterFields,
  allowList: string[]
): Promise<any[]> => {
  const options = {
    includes: allowList,
    sort: [{ modified_at: { order: 'desc' } }],
  };
  return await _fetchInsights(fetchParams, options);
};

/**
 * Fetch the first insight using the specified filter parameters
 * @param fetchParams an object of field-value pairs to filter by
 */
export const getFirstInsight = async (
  fetchParams: InsightFilterFields
): Promise<Insight | undefined> => {
  const options = {
    excludes: ['image', 'annotation_state'],
    size: 1,
  };
  const insights = await _fetchInsights(fetchParams, options);
  return insights.length > 0 ? insights[0] : undefined;
};

const _fetchInsights = async (fetchParams: InsightFilterFields, options: any) => {
  const filters = _fetchParamsToFilters(fetchParams);

  // Don't send long requests as a GET
  if (filters && JSON.stringify(filters).length > 1000) {
    const { data } = await API.post('insights/search', {
      filters,
      options,
    });
    return data;
  } else {
    const { data } = await API.get('insights', {
      params: {
        filters: JSON.stringify(filters),
        options,
      },
    });
    return data;
  }
};

const _fetchParamsToFilters = (fetchParams: InsightFilterFields) => {
  return Object.keys(fetchParams)
    .map((field) => ({ field, value: (fetchParams as any)[field] }))
    .filter((f) => f.value !== undefined && f.value !== null);
};

export const extractMetadataDetails = (
  dataState: DataState | null,
  insightLastUpdate?: number
): InsightMetadata => {
  const summary: InsightMetadata = {
    insightLastUpdate: insightLastUpdate ?? Date.now(),
  };
  if (!dataState) return summary;

  if (isDataAnalysisState(dataState)) {
    const datacubes: {
      datasetName: string;
      outputName: string;
      source: string;
    }[] = [];
    dataState.analysisItems.forEach(() => {
      // TODO: record metadata about the analysis items
      // if (isNewAnalysisItem(item)) return;
      // const { cachedMetadata } = item;
      // datacubes.push({
      //   datasetName: cachedMetadata.datacubeName,
      //   outputName: cachedMetadata.featureName,
      //   source: cachedMetadata.source,
      // });
    });
    summary.datacubes = datacubes;
  }

  return summary;
};

export const removeInsight = async (id: string) => {
  const result = await deleteInsight(id);
  // FIXME: This should also remove the insight from any questions it's linked to
  const message = result.status === 200 ? INSIGHTS.SUCCESSFUL_REMOVAL : INSIGHTS.ERRONEOUS_REMOVAL;
  const toast = useToaster();
  if (message === INSIGHTS.SUCCESSFUL_REMOVAL) {
    toast(message, TYPE.SUCCESS, false);
  } else {
    toast(message, TYPE.INFO, true);
  }
};
