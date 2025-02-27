import { ProjectType } from '@/types/Enums';
import { FullInsight, NewInsight } from '@/types/Insight';
import { computed, Ref, ref, watch } from 'vue';
import { useStore } from 'vuex';
import {
  fetchInsights,
  fetchPartialInsights,
  InsightFilterFields,
} from '@/services/insight-service';
import _ from 'lodash';

/**
 * Fetches insights whose context-id matches the specified contextIds.
 * @param contextIds if undefined, fetches all insights regardless of their context.
 * @param fieldAllowList if specified, only fetches the specified fields for each insight.
 * @returns the list of insights and a function to re-fetch them.
 */
export default function useInsightsData(
  contextIds: Ref<string[] | string | undefined> = ref(undefined),
  fieldAllowList?: string[]
) {
  const insights = ref<(FullInsight | NewInsight)[]>([]);

  const store = useStore();
  const project = computed(() => store.getters['app/project']);
  const projectType = computed(() => store.getters['app/projectType']);

  const triggerInsightFetch = async (
    contextIds: string[] | string | undefined,
    projectType: ProjectType,
    projectId: string,
    fieldAllowList: string[] | undefined
  ) => {
    // fetch project-specific insights
    const contextInsightsSearchFields: InsightFilterFields = {};
    if (projectType === ProjectType.Analysis) {
      // when fetching project-specific insights, then project-id is relevant
      contextInsightsSearchFields.project_id = projectId;
    }
    if (contextIds && contextIds.length > 0) {
      contextInsightsSearchFields.context_id = contextIds; // note passing potentially an array of context to match against
    }
    const fetchedInsights =
      !fieldAllowList || fieldAllowList.length === 0
        ? await fetchInsights(contextInsightsSearchFields)
        : await fetchPartialInsights(contextInsightsSearchFields, fieldAllowList);
    const deduped = _.uniqBy([...fetchedInsights], 'id');
    return deduped;
  };

  // An exported function to let the caller manually re-fetch insights.
  const reFetchInsights = async () => {
    const fetchedInsights = await triggerInsightFetch(
      contextIds.value,
      projectType.value,
      project.value,
      fieldAllowList
    );
    if (fetchedInsights === undefined) {
      // Fetch was never performed, so return, OR
      // Dependencies have changed since the fetch started, so ignore the
      //  fetch results to avoid a race condition.
      return;
    }
    insights.value = fetchedInsights;
  };

  // Refetch insights when the context changes.
  watch(
    [contextIds, projectType, project],
    async (newValues, oldValues, onInvalidate) => {
      let isCancelled = false;
      onInvalidate(() => {
        isCancelled = true;
      });
      const fetchedInsights = await triggerInsightFetch(
        contextIds.value,
        projectType.value,
        project.value,
        fieldAllowList
      );
      if (fetchedInsights === undefined || isCancelled) {
        // Fetch was never performed, so return, OR
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      insights.value = fetchedInsights;
    },
    { immediate: true }
  );

  return {
    insights,
    reFetchInsights,
  };
}
