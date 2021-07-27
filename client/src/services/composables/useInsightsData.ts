import { ProjectType } from '@/types/Enums';
import { Insight } from '@/types/Insight';
import { computed, ref, Ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { fetchInsights, InsightFilterFields } from '@/services/insight-service';
import _ from 'lodash';

export default function useInsightsData(insightsFetchedAt: Ref<number>) {
  const listContextInsights = ref([]) as Ref<Insight[]>;

  const store = useStore();
  const contextIds = computed(() => store.getters['insightPanel/contextId']);
  const project = computed(() => store.getters['app/project']);
  // const currentView = computed(() => store.getters['app/currentView']);
  const projectType = computed(() => store.getters['app/projectType']);

  watchEffect(onInvalidate => {
    console.log('refetching insights at: ' + new Date(insightsFetchedAt.value).toTimeString());
    let isCancelled = false;
    async function getInsights() {
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
      const ignoreContextId = false; // currentView.value === 'domainDatacubeOverview' || currentView.value === 'overview';
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
      if (contextIds.value && contextIds.value.length > 0) {
        contextIds.value.forEach((contextId: string) => {
          const searchFilter = _.clone(contextInsightsSearchFields);
          searchFilter.context_id = contextId;
          contextFilterArray.push(searchFilter);
        });
      } else {
        contextFilterArray.push(contextInsightsSearchFields);
      }
      const contextInsights = await fetchInsights(contextFilterArray);

      const insights = [...publicInsights, ...contextInsights];
      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      listContextInsights.value = _.uniqBy(insights, 'id');
      store.dispatch('contextInsightPanel/setCountContextInsights', listContextInsights.value.length);
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    getInsights();
  });

  return listContextInsights;
}
