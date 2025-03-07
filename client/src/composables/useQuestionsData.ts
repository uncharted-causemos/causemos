import { ProjectType } from '@/types/Enums';
import { AnalyticalQuestion, UnpersistedAnalyticalQuestion, ViewState } from '@/types/Insight';
import { computed, ref, watchEffect } from 'vue';
import { useStore } from 'vuex';
import { InsightFilterFields } from '@/services/insight-service';
import _ from 'lodash';
import {
  addQuestion,
  deleteQuestion,
  fetchQuestions,
  updateQuestion,
} from '../services/question-service';

const getOrderValueFromSection = (section: AnalyticalQuestion) => {
  return section.view_state.analyticalQuestionOrder;
};

export default function useQuestionsData() {
  const questionsList = ref<AnalyticalQuestion[]>([]);
  const sortedQuestionsList = computed(() =>
    _.sortBy(questionsList.value, getOrderValueFromSection)
  );

  const questionsFetchedAt = ref(0);

  const reFetchQuestions = () => {
    questionsFetchedAt.value = Date.now();
  };

  const store = useStore();
  const project = computed(() => store.getters['app/project']);
  const projectType = computed(() => store.getters['app/projectType']);

  watchEffect((onInvalidate) => {
    // This condition should always return true, it's just used to add
    //  questionsFetchedAt to this watchEffect's dependency array
    if (questionsFetchedAt.value < 0) {
      return;
    }
    let isCancelled = false;
    async function getQuestions() {
      // fetch context-specific questions
      const contextQuestionsSearchFields: InsightFilterFields = {};
      if (projectType.value === ProjectType.Analysis) {
        // when fetching project-specific insights, then project-id is relevant
        contextQuestionsSearchFields.project_id = project.value;
      }
      const contextQuestions = await fetchQuestions([contextQuestionsSearchFields]);

      if (isCancelled) {
        // Dependencies have changed since the fetch started, so ignore the
        //  fetch results to avoid a race condition.
        return;
      }
      const allQuestions = _.uniqBy([...contextQuestions], 'id');

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

  const addSection = async (
    title: string,
    handleSuccessfulUpdate: (newSectionId: string) => void,
    handleFailedUpdate: () => void
  ) => {
    const view_state: ViewState = _.cloneDeep(store.getters['insightPanel/viewState']);
    const lastSection = _.last(sortedQuestionsList.value);
    let newSectionOrderIndex = sortedQuestionsList.value.length;
    if (lastSection) {
      const lastSectionOrderIndex = getOrderValueFromSection(lastSection);
      if (lastSectionOrderIndex) {
        newSectionOrderIndex = lastSectionOrderIndex + 1;
      }
    }
    view_state.analyticalQuestionOrder = newSectionOrderIndex;
    const newSection: UnpersistedAnalyticalQuestion = {
      question: title,
      project_id: store.getters['app/project'],
      context_id: store.getters['insightPanel/contextId'],
      linked_insights: [],
      view_state,
    };
    const result = await addQuestion(newSection);
    if (result.status === 200) {
      handleSuccessfulUpdate(result.data.id);
      reFetchQuestions();
    } else {
      handleFailedUpdate();
    }
  };

  const updateSectionTitle = async (
    sectionId: string,
    newSectionTitle: string,
    handleFailedUpdate: () => void
  ) => {
    const section = questionsList.value.find((section) => section.id === sectionId);
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
      question: newSectionTitle,
    };
    const result = await updateQuestion(updatedSection.id as string, updatedSection);
    if (result.status === 200) {
      reFetchQuestions();
    } else {
      handleFailedUpdate();
    }
  };

  const deleteSection = async (
    sectionId: string,
    handleSuccessfulUpdate: () => void,
    handleFailedUpdate: () => void
  ) => {
    const listBeforeDeletion = questionsList.value;
    questionsList.value = questionsList.value.filter((section) => section.id !== sectionId);

    const result = await deleteQuestion(sectionId as string);
    if (result.status === 200) {
      handleSuccessfulUpdate();
    } else {
      questionsList.value = listBeforeDeletion;
      handleFailedUpdate();
    }
  };

  const moveSectionAboveSection = async (movedSectionId: string, targetSectionId: string) => {
    const sections = _.cloneDeep(sortedQuestionsList.value);
    const movedSection = sections.find((section) => section.id === movedSectionId);
    const targetSection = sections.find((section) => section.id === targetSectionId);
    if (movedSection === undefined || targetSection === undefined) {
      return;
    }
    const targetSectionIndex = sections.findIndex((section) => section.id === targetSectionId);
    let newPosition = 0;
    const targetSectionOrderNumber = targetSection.view_state.analyticalQuestionOrder as number;
    if (targetSectionIndex === 0) {
      // Dropped onto the question that's currently first in the list
      newPosition = targetSectionOrderNumber - 1;
    } else {
      // Dropping between two questions
      const questionAbove = sections[targetSectionIndex - 1];
      const questionAboveOrderNumber = questionAbove.view_state.analyticalQuestionOrder as number;
      // New position is halfway between their order numbers
      newPosition =
        questionAboveOrderNumber + (targetSectionOrderNumber - questionAboveOrderNumber) / 2;
    }
    // The list of sections automatically resorts itself
    movedSection.view_state.analyticalQuestionOrder = newPosition;
    questionsList.value = sections;
    // Update question on the backend for persistent ordering
    await updateQuestion(movedSection.id as string, movedSection);
  };

  const addInsightToSection = async (insightId: string, sectionId: string) => {
    const section = questionsList.value.find((section) => section.id === sectionId);
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
    await updateQuestion(sectionId, section);
  };

  const removeInsightFromSection = async (insightId: string, sectionId: string) => {
    const section = questionsList.value.find((section) => section.id === sectionId);
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
      (linkedInsightId) => linkedInsightId !== insightId
    );
    // update question on the backend
    await updateQuestion(sectionId, section);
  };

  // Reorder an insight within a section or drag an insight from one section to
  //  another.
  // Note: newPosition represents the index where the insight should end up.
  //  Since a section cannot contain two copies of the same insight, any value
  //  passed for that parameter should take into account that if the insight
  //  exists earlier in the list it will be removed.
  // Note: fromSectionId === '' when assigning an insight from the tile view.
  const moveInsight = async (
    insightId: string,
    fromSectionId: string,
    toSectionId: string,
    newPosition: number
  ) => {
    const toSection = questionsList.value.find((section) => section.id === toSectionId);
    if (toSection === undefined) {
      return;
    }
    if (fromSectionId !== '' && fromSectionId !== toSectionId) {
      removeInsightFromSection(insightId, fromSectionId);
    }
    const listWithoutInsight = toSection.linked_insights.filter(
      (_insightId) => _insightId !== insightId
    );
    listWithoutInsight.splice(newPosition, 0, insightId);
    toSection.linked_insights = listWithoutInsight;
    // Update section on the backend
    await updateQuestion(toSectionId, toSection);
  };

  const getQuestionsThatIncludeInsight = (insightId: string) =>
    sortedQuestionsList.value.filter((section) => section.linked_insights.includes(insightId));

  return {
    questionsList: sortedQuestionsList,
    updateSectionTitle,
    addSection,
    deleteSection,
    moveSectionAboveSection,
    addInsightToSection,
    removeInsightFromSection,
    moveInsight,
    getQuestionsThatIncludeInsight,
    reFetchQuestions,
  };
}
