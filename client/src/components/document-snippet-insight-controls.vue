<template>
  <div class="document-snippet-insight-controls-container">
    <div v-if="!savedInsight?.id">
      <button class="btn btn-default btn-sm" :disabled="isSaveButtonDisabled" @click="saveInsight">
        <i class="fa fa-fw fa-star" />
        Save insight
      </button>
    </div>
    <div v-else>
      <div class="edit-btn-group">
        <label class="saved-label"><i class="fa fa-fw fa-check" /> Insight saved</label>
        <button class="btn btn-default btn-sm" @click="startEditingInsight">
          <i class="fa fa-fw fa-pencil" />
          Edit
        </button>
      </div>
      <DropdownButton
        class="dropdown-button"
        :class="{ disabled: dropdownActionDisabled }"
        :items="questionsDropdown"
        :inner-button-label="selectedDropdownItems.length > 0 ? '' : 'Add to checklist question'"
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
import { AnalyticalQuestion, FullInsight, Insight } from '@/types/Insight';
import { InsightMetadataType } from '@/types/Enums';
import useInsightManager from '@/composables/useInsightManager';

const route = useRoute();
const toaster = useToaster();
const { getDataState, getViewState } = useInsightStore();

const props = defineProps<{
  snippetData: Snippet;
  snippetElementRef: HTMLElement;
  contentElementSelector: string; // css class for the content to be saved
  questionsList: AnalyticalQuestion[];
}>();

const savedInsight = ref<Insight | null>(null);
const isSaveButtonDisabled = ref(false);

const questionsDropdown = computed(() => {
  return [...props.questionsList.map((q) => ({ value: q.id, displayName: q.question }))];
});

const saveInsight = async () => {
  isSaveButtonDisabled.value = true;
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
  const insightName = `${documentTitle} (paragraph ${fragmentParagraphLocation + 1})`;

  // Save new insight
  const newInsight: FullInsight = {
    name: insightName,
    description: '',
    project_id: route.params.project as string,
    context_id: [route.params.analysisId as string],
    url: route.fullPath,
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
    metadata: {
      type: InsightMetadataType.DocumentSnippet,
      ...props.snippetData,
    },
  };
  try {
    const data = await createInsight(newInsight);
    savedInsight.value = { ...newInsight, ...data };
    toaster(INSIGHTS.SUCCESSFUL_ADDITION, TYPE.SUCCESS, false);
  } catch (e) {
    toaster(INSIGHTS.ERRONEOUS_ADDITION, TYPE.ERROR, true);
  } finally {
    isSaveButtonDisabled.value = false;
  }
};

const { editInsight } = useInsightManager();
const startEditingInsight = async () => {
  if (!savedInsight.value?.id) return;
  editInsight(savedInsight.value.id);
};

const dropdownActionDisabled = ref(false);
const selectedQuestions = ref<string[]>([]);
const selectedDropdownItems = ref<string[]>([]);
const updateSelectedItems = (selectedQuestionId: string[]) => {
  selectedQuestions.value = [...selectedQuestionId];
};
watch(selectedQuestions, async (newVal, oldVal) => {
  if (!savedInsight.value?.id) return;
  dropdownActionDisabled.value = true;
  // Values are question ids
  const addedToSelection = _.difference(newVal, oldVal);
  const removedFromSelection = _.difference(oldVal, newVal);
  for (const qid of addedToSelection) {
    await addInsightToQuestion(qid, savedInsight.value.id);
  }
  for (const qid of removedFromSelection) {
    await removeInsightFromQuestion(qid, savedInsight.value.id);
  }
  selectedDropdownItems.value = selectedQuestions.value;
  dropdownActionDisabled.value = false;
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/common';
.document-snippet-insight-controls-container {
  background-color: #fff;
  padding: 20px;
}
.saved-label {
  color: #038537;
}
.edit-btn-group {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding-bottom: 10px;
}
.dropdown-button {
  width: 185px;
  :deep(.dropdown-btn) {
    width: 100%;
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    span {
      width: 100%;
      text-align: initial;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  :deep(.dropdown-control) {
    width: 100%;
  }
  :deep(.dropdown-option) {
    position: relative;
    display: flex;
    flex-direction: row-reverse;
    justify-content: flex-end;
    padding-left: 30px;
    text-overflow: ellipsis;
    text-wrap: wrap;
    i {
      position: absolute;
      top: 10px;
      left: 5px;
      margin-left: 0 !important;
    }
  }
}
</style>
