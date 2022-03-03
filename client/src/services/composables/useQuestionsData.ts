import { ProjectType } from '@/types/Enums';
import { AnalyticalQuestion } from '@/types/Insight';
import { computed, ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { InsightFilterFields } from '@/services/insight-service';
import _ from 'lodash';
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

  watchEffect(onInvalidate => {
    console.log('refetching questions at: ' + new Date(questionsFetchedAt.value).toTimeString());
    let isCancelled = false;
    async function getQuestions() {
      // do not fetch if the panel is not open
      if (!(isPanelOpen.value === true || isInsightExplorerOpen.value === true)) {
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
      if (contextIds.value && contextIds.value.length > 0 && !ignoreContextId) {
        // context-id must be ignored when fetching questions at the project landing page
        publicQuestionsSearchFields.context_id = contextIds.value;
      }
      // Note that when 'ignoreContextId' is true, this means we are fetching questions for the insight explorer within an analysis project
      // For this case, public questions should not be listed
      const publicQuestions = ignoreContextId ? [] : await fetchQuestions([publicQuestionsSearchFields]);

      //
      // fetch context-specific questions
      //
      const contextQuestionsSearchFields: InsightFilterFields = {};
      if (projectType.value === ProjectType.Analysis) {
        // when fetching project-specific insights, then project-id is relevant
        contextQuestionsSearchFields.project_id = project.value;
      }
      contextQuestionsSearchFields.visibility = 'private';
      if (contextIds.value && contextIds.value.length > 0 && !ignoreContextId) {
        contextQuestionsSearchFields.context_id = contextIds.value;
      }
      const contextQuestions = await fetchQuestions([contextQuestionsSearchFields]);

      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      const allQuestions = _.uniqBy([...publicQuestions, ...contextQuestions], 'id');
      const orderedQuestions = allQuestions.map((q, index) => {
        if (!q.view_state) {
          q.view_state = {};
        }
        if (q.view_state.analyticalQuestionOrder === undefined) {
          q.view_state.analyticalQuestionOrder = index;
        }
        return q as AnalyticalQuestion;
      });

      // update the store to facilitate questions consumption in other UI places
      store.dispatch('analysisChecklist/setQuestions', orderedQuestions);

      questionsList.value = orderedQuestions;
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    getQuestions();
  });

  return {
    questionsList,
    reFetchQuestions
  };
}
