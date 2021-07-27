import { ProjectType } from '@/types/Enums';
import { Insight } from '@/types/Insight';
import { computed, ref, Ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { getInsights, InsightFilterFields } from '../insight-service';

export default function useInsightsData(insightsFetchedAt: Ref<number>) {
  const listContextInsights = ref([]) as Ref<Insight[]>;

  const store = useStore();
  const contextIds = computed(() => store.getters['insightPanel/contextId']);
  const project = computed(() => store.getters['app/project']);
  const currentView = computed(() => store.getters['app/currentView']);
  const projectType = computed(() => store.getters['app/projectType']);

  watchEffect(onInvalidate => {
    console.log('refetching insights at: ' + new Date(insightsFetchedAt.value).toTimeString());
    let isCancelled = false;
    async function fetchInsights() {
      //
      // fetch public insights
      //
      const publicInsightsSearchFields: InsightFilterFields = {};
      publicInsightsSearchFields.visibility = 'public';
      if (projectType.value !== ProjectType.Analysis) {
        // when fetching public insights, then project-id is only relevant in domain projects
        publicInsightsSearchFields.project_id = project.value;
      }
      if (contextIds.value && contextIds.value.length > 0) {
        const contextId = contextIds.value[0]; // FIXME
        if (currentView.value !== 'domainDatacubeOverview') {
          // context-id must be ignored when fetching insights at the project landing page
          publicInsightsSearchFields.context_id = contextId;
        }
      }
      const publicInsights = await getInsights(publicInsightsSearchFields);

      //
      // fetch project-specific insights
      //
      const contextInsightsSearchFields: InsightFilterFields = {};
      contextInsightsSearchFields.visibility = 'private';
      if (contextIds.value && contextIds.value.length > 0) {
        const contextId = contextIds.value[0]; // FIXME
        contextInsightsSearchFields.context_id = contextId;
      }
      const contextInsights = await getInsights(contextInsightsSearchFields);

      const insights = [...publicInsights, ...contextInsights];
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      listContextInsights.value = insights;
      store.dispatch('contextInsightPanel/setCountContextInsights', listContextInsights.value.length);
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    fetchInsights();
  });

  return listContextInsights;
}
