import { ProjectType } from '@/types/Enums';
import { Insight } from '@/types/Insight';
import { computed, ref, Ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { fetchInsights, InsightFilterFields } from '@/services/insight-service';
import _ from 'lodash';

export default function useInsightsData() {
  const insights = ref([]) as Ref<Insight[]>;

  const insightsFetchedAt = ref(0);

  const reFetchInsights = () => {
    insightsFetchedAt.value = Date.now();
  };

  const store = useStore();
  const contextIds = computed(() => store.getters['insightPanel/contextId']);
  const project = computed(() => store.getters['app/project']);
  const projectType = computed(() => store.getters['app/projectType']);

  const isPanelOpen = computed(() => store.getters['insightPanel/isPanelOpen']);

  watchEffect(onInvalidate => {
    console.log('refetching insights at: ' + new Date(insightsFetchedAt.value).toTimeString());
    let isCancelled = false;
    async function getInsights() {
      // @HACK: ignore context-id(s) when the insight explorer is open
      //  (i.e., when clicking 'Review All Insights')
      // NOTE: this only makes sense for analysis projects
      //
      // a more proper solution would be to store all context-id(s) for an analysis project,
      // and set those everytime prior to opening the insight explorer,
      // and finally restore that specific context-id once the insight explorer is closed!
      const ignoreContextId = isPanelOpen.value && projectType.value === ProjectType.Analysis;

      //
      // fetch public insights
      //
      const publicInsightsSearchFields: InsightFilterFields = {};
      publicInsightsSearchFields.visibility = 'public';
      if (projectType.value !== ProjectType.Analysis) {
        // when fetching public insights, then project-id is only relevant in domain projects
        publicInsightsSearchFields.project_id = project.value;
      }
      const publicFilterArray = [];
      if (contextIds.value && contextIds.value.length > 0 && !ignoreContextId) {
        contextIds.value.forEach((contextId: string) => {
          // context-id must be ignored when fetching insights at the project landing page
          const searchFilter = _.clone(publicInsightsSearchFields);
          searchFilter.context_id = contextId;
          publicFilterArray.push(searchFilter);
        });
      } else {
        publicFilterArray.push(publicInsightsSearchFields);
      }
      const publicInsights = await fetchInsights(publicFilterArray);

      //
      // fetch project-specific insights
      //
      const contextInsightsSearchFields: InsightFilterFields = {};
      if (projectType.value === ProjectType.Analysis) {
        // when fetching project-specific insights, then project-id is relevant
        contextInsightsSearchFields.project_id = project.value;
      }
      contextInsightsSearchFields.visibility = 'private';
      const contextFilterArray = [];
      if (contextIds.value && contextIds.value.length > 0 && !ignoreContextId) {
        contextIds.value.forEach((contextId: string) => {
          const searchFilter = _.clone(contextInsightsSearchFields);
          searchFilter.context_id = contextId;
          contextFilterArray.push(searchFilter);
        });
      } else {
        contextFilterArray.push(contextInsightsSearchFields);
      }
      const contextInsights = await fetchInsights(contextFilterArray);

      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      insights.value = _.uniqBy([...publicInsights, ...contextInsights], 'id');
      store.dispatch('contextInsightPanel/setCountContextInsights', insights.value.length);
      store.dispatch('insightPanel/setCountInsights', insights.value.length);
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    getInsights();
  });

  return {
    insights,
    reFetchInsights
  };
}