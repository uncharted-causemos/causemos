<template>
  <div class="paragraph-search-result-list-container">
    <i v-if="isLoading" class="fa fa-spinner fa-spin loading-indicator" />
    <p v-else-if="results !== null && results.length > 1" class="subdued">
      Showing top {{ results.length }} results.
    </p>
    <div class="list-items">
      <div
        class="list-item"
        v-for="(result, index) of results"
        :key="result.documentId ?? '' + index"
        @click="expandedSnippetIndex = index"
      >
        <i class="fa fa-quote-left" />
        <p v-html="result.text" class="highlight-on-hover" />
        <div class="metadata-column">
          <h5 class="subdued">{{ result.documentTitle }}</h5>
          <p class="subdued">{{ result.documentSource }}</p>
          <p class="subdued un-font-small">{{ result.documentCreationDate }}</p>
        </div>
      </div>
    </div>

    <modal-document
      v-if="expandedSnippetIndex !== null && expandedDocumentId !== null"
      :document-id="expandedDocumentId"
      :paragraph-to-scroll-to-on-load="paragraphToScrollToOnLoad"
      :highlights="highlights[expandedSnippetIndex]"
      @close="expandedSnippetIndex = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs } from 'vue';
import ModalDocument from '@/components/modals/modal-document.vue';
import useParagraphSearchResults from '@/services/composables/useParagraphSearchResults';

const props = defineProps<{ searchBarText: string }>();
const { searchBarText } = toRefs(props);

// TODO: remove 5
const { results, isLoading, highlights } = useParagraphSearchResults(searchBarText, 5);

const expandedSnippetIndex = ref<number | null>(null);
const expandedSnippet = computed(() => {
  if (results.value === null || expandedSnippetIndex.value === null) {
    return null;
  }
  return results.value[expandedSnippetIndex.value];
});
const expandedDocumentId = computed(() => expandedSnippet.value?.documentId ?? null);
const paragraphToScrollToOnLoad = computed(() =>
  expandedSnippet.value === null
    ? null
    : {
        text: expandedSnippet.value.text,
        paragraphIndexWithinDocument: expandedSnippet.value.fragmentParagraphLocation,
      }
);
</script>

<style lang="scss" scoped>
@import '@/styles/uncharted-design-tokens';
@import '@/styles/documents';
.paragraph-search-result-list-container {
  display: flex;
  flex-direction: column;
}

.loading-indicator {
  align-self: flex-start;
}

.list-items {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  margin-top: 10px;
}

.list-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid $un-color-black-10;
  cursor: pointer;

  i {
    color: $un-color-black-30;
  }

  p {
    width: 640px;
  }

  &:hover .highlight-on-hover {
    color: $selected-dark;
  }
}

.metadata-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
