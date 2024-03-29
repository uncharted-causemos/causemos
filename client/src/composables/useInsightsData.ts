import { ProjectType } from '@/types/Enums';
import { Insight, InsightImage, NewInsight } from '@/types/Insight';
import { computed, ref, Ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import {
  fetchInsights,
  fetchPartialInsights,
  InsightFilterFields,
} from '@/services/insight-service';
import _ from 'lodash';

export default function useInsightsData(
  preventFetch?: Ref<boolean>,
  fieldAllowList?: string[],
  isContextInsightPanelOpen = false
) {
  const insightMap = ref(new Map<string, Insight | NewInsight>());
  const insightImageMap = ref<Map<string, InsightImage>>(new Map<string, InsightImage>());

  const insights = computed<(Insight | NewInsight)[]>(() => Array.from(insightMap.value.values()));

  const insightsFetchedAt = ref(0);

  const store = useStore();
  const contextIds = computed(() => store.getters['insightPanel/contextId']);
  const project = computed(() => store.getters['app/project']);
  const projectType = computed(() => store.getters['app/projectType']);

  const isInsightExplorerOpen = computed(() => store.getters['insightPanel/isPanelOpen']);
  const isSidePanelOpen = computed(() => store.getters['panel/isPanelOpen']);

  const shouldRefetchInsights = computed(() => store.getters['insightPanel/shouldRefetchInsights']);

  const reFetchInsights = () => {
    insightsFetchedAt.value = Date.now();
  };

  watchEffect(() => {
    if (shouldRefetchInsights.value) {
      reFetchInsights();
    }
  });

  watchEffect((onInvalidate) => {
    if (preventFetch?.value) {
      return;
    }
    // This condition should always return true, it's just used to add
    //  insightsFetchedAt to this watchEffect's dependency array
    if (insightsFetchedAt.value < 0) {
      return;
    }
    let isCancelled = false;
    async function getInsights() {
      // do not fetch if the panel is not open
      const areInsightsVisible =
        isInsightExplorerOpen.value || isContextInsightPanelOpen || isSidePanelOpen.value;
      // FIXME: this logic doesn't make sense, why would we only want to return
      //  early if both of these conditions are false? Seems like it should be
      //  an "or" rather than an "and".
      // shouldRefetchInsights is only set to false by this function
      if (!shouldRefetchInsights.value && !areInsightsVisible) {
        return;
      }

      // if context-id is undefined, then it means no datacubes/CAGs are listed, so ignore fetch
      if (contextIds.value === undefined) {
        return;
      }

      // @HACK: ignore context-id(s) when the insight explorer is open
      //  (i.e., when clicking 'Review All Insights')
      // NOTE: this only makes sense for analysis projects
      //
      // a more proper solution would be to store all context-id(s) for an analysis project,
      // and set those everytime prior to opening the insight explorer,
      // and finally restore that specific context-id once the insight explorer is closed!
      const ignoreContextId =
        isInsightExplorerOpen.value === true && projectType.value === ProjectType.Analysis;

      //
      // fetch public insights
      //
      const publicInsightsSearchFields: InsightFilterFields = {};
      publicInsightsSearchFields.visibility = 'public';
      if (projectType.value !== ProjectType.Analysis) {
        // when fetching public insights, then project-id is only relevant in domain projects
        publicInsightsSearchFields.project_id = project.value;
      }
      if (contextIds.value && contextIds.value.length > 0 && !ignoreContextId) {
        publicInsightsSearchFields.context_id = contextIds.value; // note passing potentially an array of context to match against
      }
      // Note that when 'ignoreContextId' is true, this means we are fetching insights for the insight explorer within an analysis project
      // For this case, public insights should not be listed
      let publicInsights = [];
      if (!ignoreContextId) {
        if (!fieldAllowList || fieldAllowList.length === 0) {
          publicInsights = await fetchInsights(publicInsightsSearchFields);
        } else {
          publicInsights = await fetchPartialInsights(publicInsightsSearchFields, fieldAllowList);
        }
      }

      //
      // fetch project-specific insights
      //
      const contextInsightsSearchFields: InsightFilterFields = {};
      if (projectType.value === ProjectType.Analysis) {
        // when fetching project-specific insights, then project-id is relevant
        contextInsightsSearchFields.project_id = project.value;
      }
      contextInsightsSearchFields.visibility = 'private';
      if (contextIds.value && contextIds.value.length > 0 && !ignoreContextId) {
        contextInsightsSearchFields.context_id = contextIds.value; // note passing potentially an array of context to match against
      }
      let contextInsights;
      if (!fieldAllowList || fieldAllowList.length === 0) {
        contextInsights = await fetchInsights(contextInsightsSearchFields);
      } else {
        contextInsights = await fetchPartialInsights(contextInsightsSearchFields, fieldAllowList);
      }

      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      const deduped = _.uniqBy([...publicInsights, ...contextInsights], 'id');
      insightMap.value = new Map<string, Insight>(deduped.map((i) => [i.id as string, i]));
      insightImageMap.value.clear(); // remove all stores images to force re-fetch
      store.dispatch('insightPanel/setCountInsights', deduped.length);
      store.dispatch('insightPanel/setShouldRefetchInsights', false);
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    getInsights();
  });

  return {
    insights,
    reFetchInsights,
  };
}
