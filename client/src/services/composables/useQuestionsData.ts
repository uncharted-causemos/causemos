import { ProjectType } from '@/types/Enums';
import { AnalyticalQuestion, ViewState } from '@/types/Insight';
import { computed, ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { InsightFilterFields } from '@/services/insight-service';
import _ from 'lodash';
import { addQuestion, deleteQuestion, fetchQuestions, updateQuestion } from '../question-service';
import { useRoute } from 'vue-router';

const getOrderValueFromSection = (section: AnalyticalQuestion) => {
  return section.view_state.analyticalQuestionOrder;
};

export default function useQuestionsData() {
  const questionsList = ref<AnalyticalQuestion[]>([]);

  const questionsFetchedAt = ref(0);

  const reFetchQuestions = () => {
    questionsFetchedAt.value = Date.now();
  };

  const store = useStore();
  const route = useRoute();
  const contextIds = computed(() => store.getters['insightPanel/contextId']);
  const project = computed(() => store.getters['app/project']);
  const projectType = computed(() => store.getters['app/projectType']);

  const isPanelOpen = computed(() => store.getters['panel/isPanelOpen']);
  const isInsightExplorerOpen = computed(() => store.getters['insightPanel/isPanelOpen']);

  watchEffect(onInvalidate => {
    // This condition should always return true, it's just used to add
    //  questionsFetchedAt to this watchEffect's dependency array
    if (questionsFetchedAt.value < 0) { return; }
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

      questionsList.value = allQuestions.map((q, index) => {
        if (!q.view_state) {
          q.view_state = {};
        }
        if (q.view_state.analyticalQuestionOrder === undefined) {
          q.view_state.analyticalQuestionOrder = index;
        }
        return q as AnalyticalQuestion;
      });
    }
    onInvalidate(() => {
      isCancelled = true;
    });
    getQuestions();
  });

  const addSection = (
    title: string,
    handleSuccessfulUpdate: () => void,
    handleFailedUpdate: () => void
  ) => {
    const view_state: ViewState = _.cloneDeep(
      store.getters['insightPanel/viewState']
    );
    const lastSection = _.last(questionsList.value);
    let newSectionOrderIndex = questionsList.value.length;
    if (lastSection) {
      const lastSectionOrderIndex = getOrderValueFromSection(lastSection);
      if (lastSectionOrderIndex) {
        newSectionOrderIndex = lastSectionOrderIndex + 1;
      }
    }
    view_state.analyticalQuestionOrder = newSectionOrderIndex;
    const projectType = store.getters['app/projectType'];
    const currentView = store.getters['app/currentView'];
    // FIXME: Similar to insightTargetView. Can they be combined/removed?
    // Insight created during model publication are visible in the full list of
    //  insights, and as context specific insights on the corresponding model
    //  family instance's page.
    // The latter is currently supported via a special route named dataPreview.
    const target_view: string[] = projectType === ProjectType.Analysis
      ? [currentView, 'overview', 'dataComparative']
      : ['data', 'nodeDrilldown', 'dataComparative', 'overview', 'dataPreview', 'domainDatacubeOverview', 'modelPublishingExperiment'];
    const newSection: AnalyticalQuestion = {
      question: title,
      description: '',
      visibility: 'private',
      project_id: store.getters['app/project'],
      context_id: store.getters['insightPanel/contextId'],
      url: route.fullPath,
      target_view,
      pre_actions: null,
      post_actions: null,
      linked_insights: [],
      view_state
    };
    addQuestion(newSection).then((result) => {
      if (result.status === 200) {
        handleSuccessfulUpdate();
        reFetchQuestions();
      } else {
        handleFailedUpdate();
      }
    });
  };

  const updateSectionTitle = (
    sectionId: string,
    newSectionTitle: string,
    handleFailedUpdate: () => void
  ) => {
    const section = questionsList.value.find(
      section => section.id === sectionId
    );
    if (section === undefined) {
      console.error(
        'Unable to find section with ID',
        sectionId,
        'while attempting to retitle it to:',
        newSectionTitle,
        '.'
      );
      handleFailedUpdate();
      return;
    }
    const updatedSection = {
      ...section,
      question: newSectionTitle
    };
    updateQuestion(updatedSection.id as string, updatedSection).then(
      result => {
        if (result.status === 200) {
          reFetchQuestions();
        } else {
          handleFailedUpdate();
        }
      }
    );
  };

  const deleteSection = (
    sectionId: string,
    handleSuccessfulUpdate: () => void,
    handleFailedUpdate: () => void
  ) => {
    const listBeforeDeletion = questionsList.value;
    questionsList.value = questionsList.value.filter(
      section => section.id !== sectionId
    );

    deleteQuestion(sectionId as string).then(result => {
      if (result.status === 200) {
        handleSuccessfulUpdate();
      } else {
        questionsList.value = listBeforeDeletion;
        handleFailedUpdate();
      }
    });
  };

  const moveSectionAboveSection = async (
    movedSectionId: string,
    targetSectionId: string
  ) => {
    const sections = _.cloneDeep(questionsList.value);
    const movedSection = sections.find(
      section => section.id === movedSectionId
    );
    const targetSection = sections.find(
      section => section.id === targetSectionId
    );
    if (movedSection === undefined || targetSection === undefined) {
      return;
    }
    const targetSectionIndex = sections.findIndex(
      section => section.id === targetSectionId
    );
    let newPosition = 0;
    const targetSectionOrderNumber = targetSection.view_state
      .analyticalQuestionOrder as number;
    if (targetSectionIndex === 0) {
      // Dropped onto the question that's currently first in the list
      newPosition = targetSectionOrderNumber - 1;
    } else {
      // Dropping between two questions
      const questionAbove = sections[targetSectionIndex - 1];
      const questionAboveOrderNumber = questionAbove.view_state
        .analyticalQuestionOrder as number;
      // New position is halfway between their order numbers
      newPosition = questionAboveOrderNumber + (targetSectionOrderNumber - questionAboveOrderNumber) / 2;
    }
    // The list of sections automatically resorts itself
    movedSection.view_state.analyticalQuestionOrder = newPosition;
    questionsList.value = [...questionsList.value];
    // Update question on the backend for persistent ordering
    await updateQuestion(movedSection.id as string, movedSection);
  };

  const addInsightToSection = (insightId: string, sectionId: string) => {
    const section = questionsList.value.find(section => section.id === sectionId);
    if (section === undefined) {
      console.error(
        'Unable to find section with ID',
        sectionId,
        'when attempting to assign insight with ID',
        insightId,
        'to it.'
      );
      return;
    }
    if (section.linked_insights.includes(insightId)) {
      // Don't allow an insight to be added to a section more than once.
      return;
    }
    section.linked_insights.push(insightId);
    // update section on the backend
    updateQuestion(sectionId, section);
  };

  const removeInsightFromSection = (insightId: string, sectionId: string) => {
    const section = questionsList.value.find(section => section.id === sectionId);
    if (section === undefined) {
      console.error(
        'Unable to find section with ID',
        sectionId,
        'when attempting to remove insight with ID',
        insightId,
        'from it.'
      );
      return;
    }
    section.linked_insights = section.linked_insights.filter(
      linkedInsightId => linkedInsightId !== insightId
    );
    // update question on the backend
    updateQuestion(sectionId, section);
  };

  return {
    questionsList: computed(() =>
      _.sortBy(questionsList.value, getOrderValueFromSection)
    ),
    reFetchQuestions,
    updateSectionTitle,
    addSection,
    deleteSection,
    moveSectionAboveSection,
    addInsightToSection,
    removeInsightFromSection
  };
}
