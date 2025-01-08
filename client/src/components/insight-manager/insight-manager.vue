<template>
  <div class="insight-manager-container" :class="{ 'panel-hidden': !isOpen }">
    <InsightPresentationModal
      v-if="currentPane === 'review-insight'"
      class="insight-modal"
      :review-position="reviewPosition"
      :questions-list="questionsList"
      :insights="insights"
      @set-review-position="setReviewPosition"
      @remove-insight-from-question="removeInsightFromSection"
    />
    <!-- TODO: remove -->
    <!-- <review-insight-modal v-if="isReviewInsightModalOpen"  /> -->
    <InsightEditModal
      v-if="currentPane === 'review-edit-insight' || currentPane === 'review-new-insight'"
      class="insight-modal"
      :insight-id="idOfInsightToEdit"
      :questions-list="questionsList"
      @cancel-editing-insight="cancelEditingInsight"
      @refresh-questions-and-insights="refreshQuestionsAndInsights"
    />
    <list-insights-modal
      v-if="isOpen && currentPane === 'list-insights'"
      @set-review-position="setReviewPosition"
    />
  </div>
</template>

<script setup lang="ts">
import { useStore } from 'vuex';
import { computed } from 'vue';
import ListInsightsModal from '@/components/insight-manager/list-insights-modal.vue';
import InsightPresentationModal from './insight-presentation-modal.vue';
import useInsightManager from '@/composables/useInsightManager';
import InsightEditModal from './insight-edit-modal.vue';
import useQuestionsData from '@/composables/useQuestionsData';
import useInsightsData from '@/composables/useInsightsData';

const { reviewPosition, setReviewPosition, idOfInsightToEdit, cancelEditingInsight } =
  useInsightManager();

const store = useStore();
const isPanelOpen = computed(() => store.getters['insightPanel/isPanelOpen']);
const currentPane = computed(() => store.getters['insightPanel/currentPane']);

const isOpen = computed(() => {
  return isPanelOpen.value === true;
});

const {
  questionsList,
  removeInsightFromSection,
  // updateSectionTitle,
  // addSection,
  // deleteSection,
  // moveSectionAboveSection,
  // moveInsight,
  reFetchQuestions,
} = useQuestionsData();
const { insights, reFetchInsights } = useInsightsData();

const refreshQuestionsAndInsights = () => {
  reFetchQuestions();
  reFetchInsights();
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.insight-manager-container {
  position: absolute;
  display: flex;
  flex-direction: column;
  top: 0;
  right: 0;
  width: 100%;
  height: 100vh;
  z-index: 600;
  transition: all 0.5s ease;
  padding: 0;
  background-color: $background-light-3;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.12), 0 4px 4px rgba(0, 0, 0, 0.24);
  overflow-y: auto;
  overflow-x: hidden;
  word-wrap: break-word;
  color: #707070;
}

.insight-manager-container.panel-hidden {
  display: none;
}

.insight-modal {
  position: absolute;
  inset: 10px;
  border-radius: 3px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  overflow: hidden;
}
</style>
