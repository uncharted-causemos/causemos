import { ProjectType } from '@/types/Enums';
import { Insight, InsightImage, FullInsight } from '@/types/Insight';
import { computed, ref, Ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { fetchInsights, fetchPartialInsights, InsightFilterFields } from '@/services/insight-service';
import _ from 'lodash';

export default function useInsightsData(preventFetch?: Ref<boolean>, fieldAllowList?: string[]) {
  const insightMap = ref<Map<string, Insight>>(new Map<string, Insight>());
  const insightImageMap = ref<Map<string, InsightImage>>(new Map<string, InsightImage>());

  const insights = computed<Insight[]>(() => Array.from(insightMap.value.values()));

  const insightsFetchedAt = ref(0);

  /**
   * Returns the previously fetched insights matching the provided IDs.
   * NOTE: This will not fetch new insights.
   * @param insightIDs A list of insight IDs
   */
  const getInsightsByIDs = (insightIDs: string[]) => {
    const result: Insight[] = [];
    insightIDs.forEach(insightId => {
      const ins = insightMap.value.get(insightId);
      if (ins) {
        result.push(ins);
      }
    });
    return result;
  };

  /**
   * Fetches images for previously fetched insights that match the provided IDs.
   * If an insight with a given ID hasn't been fetched using this composable the image
   * will not be fetched.
   * Caching is utilised so that existing images aren't downloaded again.
   * The cache is cleared when a new set of insights is fetched using this composable.
   * @param insightIDs
   */
  const fetchImagesForInsights = async (insightIDs: string[]): Promise<FullInsight[]> => {
    const result: FullInsight[] = [];
    const idsToFetch: string[] = [];
    // use existing images if available
    for (const id of insightIDs) {
      const insight = insightMap.value.get(id);
      const image = insightImageMap.value.get(id);
      if (insight) {
        if (image) {
          result.push({ ...insight, ...image });
        } else {
          idsToFetch.push(id);
        }
      }
    }

    // fetch any images we don't have and store for later
    if (idsToFetch.length > 0) {
      const images: InsightImage[] = await fetchPartialInsights({ id: idsToFetch }, ['id', 'thumbnail']);
      for (const img of images) {
        const insight = insightMap.value.get(img.id);
        if (insight && img) {
          result.push({ ...insight, ...img });
          insightImageMap.value.set(img.id, img);
        }
      }
    }
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
    if (preventFetch?.value) {
      return;
    }
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
      insightMap.value = new Map<string, Insight>(deduped.map(i => [i.id as string, i]));
      insightImageMap.value.clear(); // remove all stores images to force re-fetch
      store.dispatch('contextInsightPanel/setCountContextInsights', deduped.length);
      store.dispatch('insightPanel/setCountInsights', deduped.length);

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
    reFetchInsights,
    fetchImagesForInsights
  };
}
