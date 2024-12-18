import { ProjectType } from '@/types/Enums';
import { Insight, NewInsight } from '@/types/Insight';
import { computed, ref, watch } from 'vue';
import { useStore } from 'vuex';
import {
  fetchInsights,
  fetchPartialInsights,
  InsightFilterFields,
} from '@/services/insight-service';
import _ from 'lodash';

export default function useInsightsData(
  fieldAllowList?: string[],
  isContextInsightPanelOpen = false
) {
  const insights = ref<(Insight | NewInsight)[]>([]);
  watch(insights, () => {
    // TODO: remove "shouldrefetchInsights"
    store.dispatch('insightPanel/setShouldRefetchInsights', false);
  });

  const store = useStore();
  const contextIds = computed(() => store.getters['insightPanel/contextId']);
  const project = computed(() => store.getters['app/project']);
  const projectType = computed(() => store.getters['app/projectType']);

  const isInsightExplorerOpen = computed(() => store.getters['insightPanel/isPanelOpen']);
  const isSidePanelOpen = computed(() => store.getters['panel/isPanelOpen']);
  const shouldRefetchInsights = computed(() => store.getters['insightPanel/shouldRefetchInsights']);

  const triggerInsightFetch = async (
    isInsightExplorerOpen: boolean,
    isContextInsightPanelOpen: boolean,
    isSidePanelOpen: boolean,
    shouldRefetchInsights: boolean,
    contextIds: string[] | undefined,
    projectType: ProjectType,
    projectId: string,
    fieldAllowList: string[] | undefined
  ) => {
    // TODO: can we remove this check? this function won't be called if we don't want to fetch them.
    // do not fetch if the panel is not open
    const areInsightsVisible =
      isInsightExplorerOpen || isContextInsightPanelOpen || isSidePanelOpen;
    // FIXME: this logic doesn't make sense, why would we only want to return
    //  early if both of these conditions are false? Seems like it should be
    //  an "or" rather than an "and".
    // shouldRefetchInsights is only set to false by this function
    if (!shouldRefetchInsights && !areInsightsVisible) {
      return;
    }

    // if context-id is undefined, then it means no datacubes are listed, so ignore fetch
    if (contextIds === undefined) {
      return;
    }

    // TODO: contextIds should be a parameter of this composable, and then we
    //  don't need an ignoreContextId hack at all
    // FIXME: ignore context-id(s) when the insight explorer is open
    //  (i.e., when clicking 'Review All Insights')
    // NOTE: this only makes sense for analysis projects
    //
    // a more proper solution would be to store all context-id(s) for an analysis project,
    // and set those everytime prior to opening the insight explorer,
    // and finally restore that specific context-id once the insight explorer is closed!
    const ignoreContextId = isInsightExplorerOpen === true && projectType === ProjectType.Analysis;

    // fetch project-specific insights
    const contextInsightsSearchFields: InsightFilterFields = {};
    if (projectType === ProjectType.Analysis) {
      // when fetching project-specific insights, then project-id is relevant
      contextInsightsSearchFields.project_id = projectId;
    }
    if (contextIds && contextIds.length > 0 && !ignoreContextId) {
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
      isInsightExplorerOpen.value,
      isContextInsightPanelOpen,
      isSidePanelOpen.value,
      shouldRefetchInsights.value,
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
    [
      isInsightExplorerOpen,
      isSidePanelOpen,
      shouldRefetchInsights,
      contextIds,
      projectType,
      project,
    ],
    async (newValues, oldValues, onInvalidate) => {
      let isCancelled = false;
      onInvalidate(() => {
        isCancelled = true;
      });
      const fetchedInsights = await triggerInsightFetch(
        isInsightExplorerOpen.value,
        isContextInsightPanelOpen,
        isSidePanelOpen.value,
        shouldRefetchInsights.value,
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
