<template>
  <div class="index-document-snippets-container">
    <header>
      <h4>Document snippets</h4>
    </header>
    <section>
      <h5 v-if="selectedUpstreamNodeName != null">
        Snippets related to <strong>{{ props.selectedNodeName }}</strong> and
        <strong>{{ props.selectedUpstreamNodeName }}</strong>
      </h5>
      <h5 v-else>
        Snippets related to <strong>{{ props.selectedNodeName }}</strong>
      </h5>
      <div v-if="isLoadingSnippets" class="loading-indicator">
        <i class="fa fa-spin fa-spinner pane-loading-icon" />
        <p>Loading snippets...</p>
      </div>
      <p v-else-if="snippets !== null && snippets.length === 0" class="subdued">No results</p>
      <div v-else class="snippets">
        <div class="snippet" v-for="(snippet, i) in snippets" :key="i">
          <span class="open-quote">"</span>
          <div class="snippet-body">
            <p class="overflow-auto"><span v-html="snippet.text" /></p>
            <div class="bottom-row">
              <div class="metadata">
                <p>{{ snippet.documentTitle }}</p>
                <p>{{ snippet.documentAuthor }}, {{ snippet.documentSource }}</p>
              </div>
              <button class="btn btn-sm" @click="expandedSnippetIndex = i">View in context</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
  <modal-document
    v-if="expandedSnippetIndex !== null && expandedDocumentId !== null"
    :document-id="expandedDocumentId"
    :paragraph-to-scroll-to-on-load="paragraphToScrollToOnLoad"
    :highlights="highlights[expandedSnippetIndex]"
    @close="expandedSnippetIndex = null"
  />
</template>

<script setup lang="ts">
import { toRefs, ref, computed } from 'vue';
import ModalDocument from '@/components/modals/modal-document.vue';
import useParagraphSearchResults from '@/services/composables/useParagraphSearchResults';

const props = defineProps<{
  selectedNodeName: string;
  selectedUpstreamNodeName: string | null;
}>();
const { selectedNodeName, selectedUpstreamNodeName } = toRefs(props);
const expandedSnippetIndex = ref<number | null>(null);
const expandedSnippet = computed(() => {
  if (snippets.value === null || expandedSnippetIndex.value === null) {
    return null;
  }
  return snippets.value[expandedSnippetIndex.value];
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

const searchString = computed(() =>
  selectedUpstreamNodeName.value != null
    ? `${selectedNodeName.value} and ${selectedUpstreamNodeName.value}`
    : selectedNodeName.value
);

const {
  results: snippets,
  isLoading: isLoadingSnippets,
  highlights,
} = useParagraphSearchResults(searchString, 10);
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/documents';

.index-document-snippets-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

header {
  display: flex;
  flex-direction: column;
}

section {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.snippets {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.loading-indicator {
  height: 100px;
  background: $un-color-black-5;
  animation: fading 1s ease infinite alternate;
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

@keyframes fading {
  0% {
    opacity: 25%;
  }
  100% {
    opacity: 75%;
  }
}

.snippet {
  display: flex;
  .open-quote {
    // FIXME: use IBM Plex Sans or another font with more distinct open quotations
    width: 2rem;
    font-size: 2.4rem;
    line-height: 2.8rem;
    color: $un-color-black-40;
  }
  .snippet-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    .bottom-row {
      display: flex;
      align-items: center;
      .metadata {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        color: $un-color-black-40;
      }
    }
  }
}

.overflow-auto {
  overflow: auto;
}
</style>
