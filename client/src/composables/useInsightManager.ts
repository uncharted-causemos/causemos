import { ReviewPosition } from '@/types/Insight';
import { readonly, ref } from 'vue';
import useInsightStore from './useInsightStore';

const reviewPosition = ref<ReviewPosition | null>(null);
const setReviewPosition = (position: ReviewPosition | null) => {
  reviewPosition.value = position;
};

const idOfInsightToEdit = ref<string | null>(null);

export default function useInsightManager() {
  // TODO: remove dependence on store
  const { setCurrentPane, hideInsightPanel } = useInsightStore();
  const editInsight = (id: string) => {
    idOfInsightToEdit.value = id;
    setCurrentPane('review-edit-insight');
  };
  const cancelEditingInsight = () => {
    // If idOfInsightToEdit is null we're creating a new insight,
    //  so close the modal.
    if (idOfInsightToEdit.value === null) {
      hideInsightPanel();
      setCurrentPane('');
      return;
    }
    // Otherwise go back to the previous page.
    idOfInsightToEdit.value = null;
    setCurrentPane('review-insight');
  };
  const startCreatingInsight = () => {
    setCurrentPane('review-new-insight');
  };
  return {
    reviewPosition: readonly(reviewPosition),
    setReviewPosition,
    idOfInsightToEdit: readonly(idOfInsightToEdit),
    editInsight,
    cancelEditingInsight,
    startCreatingInsight,
  };
}
