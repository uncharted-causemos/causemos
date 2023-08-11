<template>
  <modal class="modal-document-container" :show-close-button="true" @close="close">
    <template #header>
      <h2>{{ documentMeta?.title ?? '...' }}</h2>
      <h5>{{ documentMeta?.producer ?? '...' }}</h5>
      <p class="subdued">
        Published
        {{
          documentMeta !== null && documentMeta.mod_date !== null
            ? dateFormatter(documentMeta.mod_date, 'MMMM DD, YYYY')
            : '...'
        }}
      </p>
    </template>
    <template #body ref="modalBodyElement">
      <div ref="contentElement"></div>
      <div ref="loadMoreTextElement">
        <div v-if="isLoading" class="loading-indicator">
          <i class="fa fa-spin fa-spinner subdued" />
          <h2 class="subdued">Loading...</h2>
        </div>
      </div>
    </template>
  </modal>
</template>

<script setup lang="ts">
import Modal from '@/components/modals/modal.vue';
import dateFormatter from '@/formatters/date-formatter';
import {
  createTextViewer,
  applyHighlights,
  replacePhraseWithScrollAnchorHTMLElement,
  HIGHLIGHTED_TEXT_CLASS,
} from '@/utils/text-viewer-util';
import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { Document, ScrollDataParagraph } from '@/types/IndexDocuments';
import { getDocument, getDocumentParagraphs } from '@/services/paragraphs-service';

const PARAGRAPH_FETCH_LIMIT = 200;
const textViewer = createTextViewer();

const props = defineProps<{
  documentId: string;
  paragraphToScrollToOnLoad: {
    text: string;
    paragraphIndexWithinDocument: number;
  } | null;
  highlights: string[];
}>();
const { documentId } = toRefs(props);

const emit = defineEmits<{ (e: 'close'): void }>();
const close = () => {
  emit('close');
};

const documentMeta = ref<Document | null>(null);
watch(
  [documentId],
  async () => {
    documentMeta.value = await getDocument(documentId.value);
  },
  { immediate: true }
);

const isLoading = ref(false);

const contentElement = ref<HTMLElement | null>(null);

const convertParagraphsToHTMLString = (paragraphs: ScrollDataParagraph[]) =>
  paragraphs.reduce((bodyText, p) => `${bodyText}<p>${p.text}</p>`, '');
/**
 * Fetches one chunk of `PARAGRAPH_FETCH_LIMIT` paragraphs.
 * If there is a `paragraphToScrollToOnLoad`, continues fetching until the paragraph is found.
 * @returns {Promise<void>}
 */
const loadInitialContent = async () => {
  isLoading.value = true;

  const firstResponse = await getDocumentParagraphs(
    documentId.value,
    scrollId.value,
    PARAGRAPH_FETCH_LIMIT
  );
  scrollId.value = firstResponse.scroll_id;

  if (props.paragraphToScrollToOnLoad === null) {
    const highlightedParagraphs = applyHighlights(
      convertParagraphsToHTMLString(firstResponse.paragraphs),
      props.highlights
    );
    textViewer.appendText(highlightedParagraphs);
    isLoading.value = false;
    return;
  }

  let loadedParagraphCount = PARAGRAPH_FETCH_LIMIT;
  let lastResponse = firstResponse;
  let allButLastParagraphs: ScrollDataParagraph[] = [];
  while (
    loadedParagraphCount < props.paragraphToScrollToOnLoad.paragraphIndexWithinDocument &&
    scrollId.value !== null
  ) {
    allButLastParagraphs = [...allButLastParagraphs, ...lastResponse.paragraphs];
    lastResponse = await getDocumentParagraphs(
      documentId.value,
      scrollId.value,
      PARAGRAPH_FETCH_LIMIT
    );
    loadedParagraphCount += PARAGRAPH_FETCH_LIMIT;
  }
  // Append all but the last chunk of paragraphs to the textViewer.
  const highlightedText = applyHighlights(
    convertParagraphsToHTMLString(allButLastParagraphs),
    props.highlights
  );
  textViewer.appendText(highlightedText);
  // Search only the last chunk of paragraphs for paragraphToScrollToOnLoad to avoid searching
  //  large body text.
  const highlightedLastParagraphs = applyHighlights(
    convertParagraphsToHTMLString(lastResponse.paragraphs),
    props.highlights
  );
  const textWithAnchorInserted = replacePhraseWithScrollAnchorHTMLElement(
    highlightedLastParagraphs,
    prepareParagraphForTextViewerSearch(props.paragraphToScrollToOnLoad.text, props.highlights)
  );
  textViewer.appendText(textWithAnchorInserted);
  textViewer.scrollToAnchor();

  isLoading.value = false;
};
onMounted(async () => {
  if (contentElement.value === null) {
    return;
  }
  contentElement.value.appendChild(textViewer.element);
  await loadInitialContent();
});

const scrollId = ref<string | null>(null);
const hasScrollId = computed(() => scrollId.value !== null);

/**
 * A compensation method to help bridge the gap between highlights provided by Jataware
 * and our highlights.  Some words may or may not be highlighted consistently in the "highlights"
 * data.  This method ensures the highlighting will match between the fragment phrase and the
 * full body document (otherwise, fragment anchor doesn't work).
 * @returns {string}
 */
const prepareParagraphForTextViewerSearch = (paragraph: string, highlights: string[]) => {
  const regex1 = new RegExp(`<span class="${HIGHLIGHTED_TEXT_CLASS}">`, 'ig');
  const regex2 = new RegExp('</span>', 'ig');

  let text = paragraph.replaceAll(regex1, '');
  text = text.replaceAll(regex2, '');
  text = applyHighlights(text, highlights);
  return text;
};

const scrollObserver = ref<IntersectionObserver | null>(null);
const loadMoreTextElement = ref<Element | null>(null);
const modalBodyElement = ref<Element | null>(null);

/**
 * When in scroll mode, this function will be triggered by the scrollObserver to fetch as required.
 * @returns {Promise<void>}
 */
const getScrollData = async () => {
  if (hasScrollId.value === false) {
    return;
  }

  isLoading.value = true;
  const result = await getDocumentParagraphs(documentId.value, scrollId.value);
  isLoading.value = false;
  const nextSetOfParagraphsAsHTML = convertParagraphsToHTMLString(result.paragraphs);
  const highlightedText = applyHighlights(nextSetOfParagraphsAsHTML, props.highlights);
  textViewer.appendText(highlightedText);

  // Once scroll_id is null there are no more paragraphs. Clear the scrollId and the observer.
  if (result.scroll_id === null) {
    scrollId.value = null;
    scrollObserver.value = null;
  }
};
onMounted(() => {
  scrollObserver.value = new IntersectionObserver(getScrollData, {
    root: modalBodyElement.value,
    rootMargin: '0px',
    threshold: 0.25,
  });
  if (loadMoreTextElement.value !== null) {
    scrollObserver.value.observe(loadMoreTextElement.value);
  }
});
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';
@import '@/styles/documents';

h2 {
  font-weight: 500;
}

.loading-indicator {
  display: flex;
  align-items: center;
  height: 100px;
  gap: 10px;
}

:deep(.modal-container) {
  padding: 0;
  width: 800px;
  height: 80vh;
  display: flex;
  flex-direction: column;

  .modal-header {
    padding: 80px;
    padding-bottom: 40px;
    border-bottom: 1px solid $un-color-black-10;
  }
  .modal-body {
    padding: 80px;
    padding-top: 0;
    margin: 0;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .modal-footer {
    display: none;
  }
}

:deep(.paragraph-to-scroll-to) {
  border-bottom: 2px solid $selected;
}
</style>
