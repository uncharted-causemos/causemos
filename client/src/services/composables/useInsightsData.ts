import { ProjectType } from '@/types/Enums';
import { Insight } from '@/types/Insight';
import { computed, ref, Ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { fetchInsights, InsightFilterFields } from '@/services/insight-service';
import _ from 'lodash';

export default function useInsightsData() {
  const insights = ref([]) as Ref<Insight[]>;

  const insightsFetchedAt = ref(0);

  const getInsightsByIDs = (insightIDs: string[]) => {
    const result: Insight[] = [];
    insightIDs.forEach(insightId => {
      const ins = insights.value.find(i => i.id === insightId);
      if (ins) {
        result.push(ins);
      }
    });
    return result;
  };

  const store = useStore();
  const contextIds = computed(() => store.getters['insightPanel/contextId']);
  const project = computed(() => store.getters['app/project']);
  const projectType = computed(() => store.getters['app/projectType']);

  const isInsightExplorerOpen = computed(() => store.getters['insightPanel/isPanelOpen']);
  const isContextInsightPanelOpen = computed(() => store.getters['contextInsightPanel/isPanelOpen']);

  const shouldRefetchInsights = computed(() => store.getters['contextInsightPanel/shouldRefetchInsights']);

  const reFetchInsights = () => {
    insightsFetchedAt.value = Date.now();
    store.dispatch('contextInsightPanel/setRefetchInsights', true);
  };

  watchEffect(onInvalidate => {
    // This condition should always return true, it's just used to add
    //  insightsFetchedAt to this watchEffect's dependency array
    if (insightsFetchedAt.value < 0) { return; }
    let isCancelled = false;
    async function getInsights() {
      if (shouldRefetchInsights.value === false) {
        // do not fetch if the panel is not open
        if (!(isInsightExplorerOpen.value === true || isContextInsightPanelOpen.value === true)) {
          return;
        }
      }

      // if context-id is undefined, then it means no datacubes/CAGs are listed, so ignore fetch
      if (contextIds.value === undefined) {
        store.dispatch('contextInsightPanel/setRefetchInsights', false);
        return;
      }

      // @HACK: ignore context-id(s) when the insight explorer is open
      //  (i.e., when clicking 'Review All Insights')
      // NOTE: this only makes sense for analysis projects
      //
      // a more proper solution would be to store all context-id(s) for an analysis project,
      // and set those everytime prior to opening the insight explorer,
      // and finally restore that specific context-id once the insight explorer is closed!
      const ignoreContextId = isInsightExplorerOpen.value === true && projectType.value === ProjectType.Analysis;

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
      const publicInsights = ignoreContextId ? [] : await fetchInsights([publicInsightsSearchFields]);

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
      const contextInsights = await fetchInsights([contextInsightsSearchFields]);

      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      insights.value = _.uniqBy([...publicInsights, ...contextInsights], 'id');
      store.dispatch('contextInsightPanel/setCountContextInsights', insights.value.length);
      store.dispatch('insightPanel/setCountInsights', insights.value.length);

      store.dispatch('contextInsightPanel/setRefetchInsights', false);
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    getInsights();
  });

  return {
    insights,
    getInsightsByIDs,
    reFetchInsights
  };
}
