import { ProjectType } from '@/types/Enums';
import { AnalyticalQuestion, Insight } from '@/types/Insight';
import { computed, ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { InsightFilterFields } from '@/services/insight-service';
import _ from 'lodash';
import useInsightsData from './useInsightsData';
import { fetchQuestions } from '../question-service';

export default function useQuestionsData() {
  const questionsList = ref<AnalyticalQuestion[]>([]);

  const questionsFetchedAt = ref(0);

  const reFetchQuestions = () => {
    questionsFetchedAt.value = Date.now();
  };

  const store = useStore();
  const contextIds = computed(() => store.getters['insightPanel/contextId']);
  const project = computed(() => store.getters['app/project']);
  const projectType = computed(() => store.getters['app/projectType']);

  const isPanelOpen = computed(() => store.getters['panel/isPanelOpen']);
  const isInsightExplorerOpen = computed(() => store.getters['insightPanel/isPanelOpen']);

  // save a local copy of all insights for quick reference whenever needed
  // FIXME: ideally this should be from a store so that changes to the insight list externally are captured
  const { insights: allInsights } = useInsightsData();
  const insightsById = (id: string) => allInsights.value.find(i => i.id === id);

  const fullLinkedInsights = (linked_insights: string[]) => {
    const result: Insight[] = [];
    linked_insights.forEach(insightId => {
      const ins = insightsById(insightId);
      if (ins) {
        result.push(ins);
      }
    });
    return result;
  };

  watchEffect(onInvalidate => {
    console.log('refetching questions at: ' + new Date(questionsFetchedAt.value).toTimeString());
    let isCancelled = false;
    async function getQuestions() {
      // do not fetch if the panel is not open
      if (!(isPanelOpen.value === true || isInsightExplorerOpen.value === true)) {
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
      const publicQuestionsSearchFields: InsightFilterFields = {};
      publicQuestionsSearchFields.visibility = 'public';
      if (projectType.value !== ProjectType.Analysis) {
        // when fetching public insights, then project-id is only relevant in domain projects
        publicQuestionsSearchFields.project_id = project.value;
      }
      const publicFilterArray = [];
      if (contextIds.value && contextIds.value.length > 0 && !ignoreContextId) {
        contextIds.value.forEach((contextId: string) => {
          // context-id must be ignored when fetching questions at the project landing page
          const searchFilter = _.clone(publicQuestionsSearchFields);
          searchFilter.context_id = contextId;
          publicFilterArray.push(searchFilter);
        });
      } else {
        publicFilterArray.push(publicQuestionsSearchFields);
      }
      // Note that when 'ignoreContextId' is true, this means we are fetching questions for the insight explorer within an analysis project
      // For this case, public questions should not be listed
      const publicQuestions = ignoreContextId ? [] : await fetchQuestions(publicFilterArray);

      //
      // fetch context-specific questions
      //
      const contextQuestionsSearchFields: InsightFilterFields = {};
      if (projectType.value === ProjectType.Analysis) {
        // when fetching project-specific insights, then project-id is relevant
        contextQuestionsSearchFields.project_id = project.value;
      }
      contextQuestionsSearchFields.visibility = 'private';
      const contextFilterArray = [];
      if (contextIds.value && contextIds.value.length > 0 && !ignoreContextId) {
        contextIds.value.forEach((contextId: string) => {
          const searchFilter = _.clone(contextQuestionsSearchFields);
          searchFilter.context_id = contextId;
          contextFilterArray.push(searchFilter);
        });
      } else {
        contextFilterArray.push(contextQuestionsSearchFields);
      }
      const contextQuestions = await fetchQuestions(contextFilterArray);

      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      const allQuestions = _.uniqBy([...publicQuestions, ...contextQuestions], 'id');
      // update the store to facilitate questions consumption in other UI places
      store.dispatch('analysisChecklist/setQuestions', allQuestions);

      questionsList.value = allQuestions;
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    getQuestions();
  });

  return {
    questionsList,
    reFetchQuestions,
    insightsById,
    fullLinkedInsights
  };
}
