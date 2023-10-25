<template>
  <div class="analysis-project-overview-question-container">
    <input
      v-if="isEditingQuestion"
      class="question-input"
      type="text"
      placeholder="What would you like to know?"
      v-model="newTitle"
      v-focus
    />
    <div class="is-editing-question-buttons" v-if="isEditingQuestion">
      <button class="btn btn-default btn-call-to-action" @click="saveTitle">
        <i class="fa fa-fw fa-check" />Confirm
      </button>
      <button class="btn btn-default" @click="discardTitle">
        <i class="fa fa-fw fa-close" />Cancel
      </button>
    </div>
    <div v-else class="question-title">
      <p class="un-font-small">
        {{ question.question }}
        <small-icon-button
          @click="emit('edit-question', question.id ?? '')"
          v-tooltip.top-center="'Edit question'"
        >
          <i class="fa fa-pencil" />
        </small-icon-button>
      </p>
      <small-icon-button
        class="delete-button"
        @click="emit('delete-question', question.id ?? '')"
        v-tooltip.top-center="'Delete question'"
      >
        <i class="fa fa-trash" />
      </small-icon-button>
    </div>
    <p class="un-font-small subdued">
      <i class="fa fa-fw fa-star" />{{ getInsightsDisplayString(question.linked_insights) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { AnalyticalQuestion } from '@/types/Insight';
import SmallIconButton from '@/components/widgets/small-icon-button.vue';
import { ref } from 'vue';

const props = defineProps<{ question: AnalyticalQuestion; isEditingQuestion: boolean }>();
const emit = defineEmits<{
  (e: 'delete-question', questionId: string): void;
  (e: 'edit-question', questionId: string): void;
  (e: 'save-title', questionId: string, newTitle: string): void;
  (e: 'stop-editing-question'): void;
}>();

const newTitle = ref(props.question.question);
const saveTitle = () => {
  emit('save-title', props.question.id ?? '', newTitle.value);
};
const discardTitle = () => {
  newTitle.value = props.question.question;
  emit('stop-editing-question');
};

const getInsightsDisplayString = (insightIds: string[]) => {
  if (insightIds.length === 0) {
    return 'No insights. Answer this question by attaching insights with the tools below.';
  }
  if (insightIds.length === 1) {
    return '1 insight.';
  }
  return `${insightIds.length} insights.`;
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/common';
.analysis-project-overview-question-container {
  display: flex;
  flex-direction: column;
  padding: 10px 20px;
  gap: 3px;

  .delete-button {
    display: none;
  }

  &:hover {
    background: $accent-lightest;
    .delete-button {
      display: inline-block;
    }
  }
}

.question-input {
  width: 100%;
  border: 1px solid $separator;
  padding: 10px;
  margin-bottom: 5px;
}

.is-editing-question-buttons {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
}

.question-title {
  display: flex;
  justify-content: space-between;
}
</style>
