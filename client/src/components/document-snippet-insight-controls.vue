<template>
  <div class="document-snippet-insight-controls-container">
    <button class="btn btn-default btn-sm" @click="() => emit('click-save', snippetIndex)">
      Save insight
    </button>
    <button class="btn btn-default btn-sm">Edit</button>
    {{ questionsList }}
    <DropdownButton
      class="dropdown-button"
      :is-dropdown-left-aligned="true"
      :items="questionsDropdown"
      :inner-button-label="'Add to checklist question'"
      :selected-items="[]"
      :is-multi-select="true"
      @items-selected="[]"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DropdownButton from '@/components/dropdown-button.vue';
import useQuestionsData from '@/composables/useQuestionsData';

// const props = defineProps<{
defineProps<{
  snippetIndex: number;
  //   selectedNodeName: string;
  //   selectedUpstreamNodeName: string | null;
  //   geoContextString: string;
}>();

const emit = defineEmits<{
  (e: 'click-save', snippetIndex: number): void;
}>();

const { questionsList } = useQuestionsData();

const questionsDropdown = computed(() => {
  return [...questionsList.value.map((q) => q.question)];
});

console.log(questionsList.value);
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
