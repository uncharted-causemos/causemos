<template>
  <div class="document-snippet-insight-controls-container">
    <div v-if="!savedInsightId">
      <button class="btn btn-default btn-sm" @click="saveInsight">Save insight</button>
    </div>
    <!-- <div v-else> -->
    <div>
      <button class="btn btn-default btn-sm">Edit</button>
      <DropdownButton
        class="dropdown-button"
        :is-dropdown-left-aligned="true"
        :items="questionsDropdown"
        :inner-button-label="'Add to checklist question'"
        :selected-items="selectedDropdownItems"
        :is-multi-select="true"
        @items-selected="updateSelectedItems"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import html2canvas from 'html2canvas';
import { TYPE } from 'vue-toastification';

import DropdownButton from '@/components/dropdown-button.vue';
import useToaster from '@/composables/useToaster';
import useInsightStore from '@/composables/useInsightStore';
import { createInsight } from '@/services/insight-service';
import { addInsightToQuestion, removeInsightFromQuestion } from '@/services/question-service';
import { INSIGHTS } from '@/utils/messages-util';
import { Snippet } from '@/types/IndexDocuments';
import { AnalyticalQuestion, FullInsight } from '@/types/Insight';

const route = useRoute();
const toaster = useToaster();
const { getDataState, getViewState } = useInsightStore();

const props = defineProps<{
  snippetData: Snippet;
  snippetElementRef: HTMLElement;
  contentElementSelector: string; // css class for the content to be saved
  questionsList: AnalyticalQuestion[];
}>();

const savedInsightId = ref('');

const questionsDropdown = computed(() => {
  return [...props.questionsList.map((q) => ({ value: q.id, displayName: q.question }))];
});

const saveInsight = async () => {
  // Create an image of the snippet
  const imgScale = 1.5;
  const snippetBodyEl = props.snippetElementRef.querySelector<HTMLElement>(
    props.contentElementSelector
  );
  const image = !snippetBodyEl
    ? ''
    : (await html2canvas(snippetBodyEl, { scale: imgScale })).toDataURL();

  // Construct insight name from snippet metadata
  const { documentTitle, fragmentParagraphLocation } = props.snippetData || {};
  const insightName = `${fragmentParagraphLocation}-${documentTitle}`;

  // Save new insight
  const newInsight: FullInsight = {
    name: insightName,
    description: '',
    visibility: 'private',
    project_id: route.params.project as string,
    context_id: [route.params.analysisId as string],
    url: route.fullPath,
    target_view: [], // Is this property actually being used in the app?
    is_default: true,
    image,
    // Note: data_state is already set globally using setDataState from `useInsightStore` in `indexStructure.vue` page.
    // So the value is available at this moment. This document snippet shares same viewState from the index structure page.
    // TODO: we should consider avoiding setting the state globally using the insight store. This makes it difficult to understand where the value is set from and how it's being modified.
    // Instead of keeping insight store globally, we should scope insight creation to its own component and space and pass necessary data for creating insight as props to it when needed.
    // e.g. Pass states or necessary data as props to review-insight-modal.vue (or a new component with similar functionality) instead of passing them through global store.
    // This might require quite a bit of refactoring so further reviews and inspection might be needed.
    data_state: getDataState(),
    view_state: getViewState(),
    analytical_question: [],
  };
  try {
    const data = await createInsight(newInsight);
    savedInsightId.value = data.id;
    toaster(INSIGHTS.SUCCESSFUL_ADDITION, TYPE.SUCCESS, false);
  } catch (e) {
    toaster(INSIGHTS.ERRONEOUS_ADDITION, TYPE.ERROR, true);
  }
};

const selectedQuestions = ref<string[]>([]);
const selectedDropdownItems = ref<string[]>([]);
const updateSelectedItems = (selectedQuestionId: string[]) => {
  selectedQuestions.value = [...selectedQuestionId];
};
watch(selectedQuestions, async (newVal, oldVal) => {
  if (!savedInsightId.value) return;
  // Values are question ids
  const addedToSelection = _.difference(newVal, oldVal);
  const removedFromSelection = _.difference(oldVal, newVal);
  for (const qid of addedToSelection) {
    await addInsightToQuestion(qid, savedInsightId.value);
  }
  for (const qid of removedFromSelection) {
    await removeInsightFromQuestion(qid, savedInsightId.value);
  }
  selectedDropdownItems.value = selectedQuestions.value;
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/common';
.document-snippet-insight-controls-container {
  background-color: #fff;
}
/* .dropdown-button {
  width: auto;
  height: auto;
  display: flex;
  margin-bottom: 4px;
  flex: 1;

  :deep(.dropdown-btn) {
    width: 100%;
    justify-content: space-between;
  }
  :deep(.dropdown-container) {
    width: 100%;
  }
} */
</style>
