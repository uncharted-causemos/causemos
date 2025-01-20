import { ReviewPosition } from '@/types/Insight';
import { computed, readonly, ref } from 'vue';

const reviewPosition = ref<ReviewPosition | null>(null);
const setReviewPosition = (position: ReviewPosition | null) => {
  reviewPosition.value = position;
};

const idOfInsightToEdit = ref<string | null>(null);

type InsightModalScreen =
  | 'list-insights'
  | 'review-insight'
  | 'review-edit-insight'
  | 'review-new-insight'
  | '';
const currentScreen = ref<InsightModalScreen>('');
const hideInsightModal = () => {
  currentScreen.value = '';
};
const isInsightModalOpen = computed(() => currentScreen.value !== '');

export default function useInsightManager() {
  const showInsightList = () => {
    currentScreen.value = 'list-insights';
  };
  const editInsight = (id: string) => {
    idOfInsightToEdit.value = id;
    currentScreen.value = 'review-edit-insight';
  };
  const cancelEditingInsight = () => {
    // If idOfInsightToEdit is null we're creating a new insight,
    //  so close the modal.
    if (idOfInsightToEdit.value === null) {
      hideInsightModal();
      return;
    }
    // Otherwise go back to the previous page.
    // TODO: this could be the list-insight page or the review-insight page
    idOfInsightToEdit.value = null;
    currentScreen.value = 'review-insight';
  };
  const startCreatingInsight = () => {
    currentScreen.value = 'review-new-insight';
  };
  const reviewInsights = () => {
    currentScreen.value = 'review-insight';
  };
  return {
    showInsightList,
    reviewPosition: readonly(reviewPosition),
    setReviewPosition,
    idOfInsightToEdit: readonly(idOfInsightToEdit),
    editInsight,
    cancelEditingInsight,
    startCreatingInsight,
    currentScreen: readonly(currentScreen),
    isInsightModalOpen,
    hideInsightModal,
    reviewInsights,
  };
}
