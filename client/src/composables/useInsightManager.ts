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
  const { setCurrentPane } = useInsightStore();
  const editInsight = (id: string) => {
    idOfInsightToEdit.value = id;
    setCurrentPane('review-edit-insight');
  };
  const cancelEditingInsight = () => {
    idOfInsightToEdit.value = null;
    // TODO: if we're creating a new insight, close the modal. Otherwise go back to the previous page.
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
