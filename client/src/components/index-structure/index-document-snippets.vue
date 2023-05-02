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
      <div v-if="snippetsForSelectedNode === null" class="loading-indicator">
        <i class="fa fa-spin fa-spinner pane-loading-icon" />
        <p>{{ SNIPPETS_LOADING }}</p>
      </div>
      <p v-else-if="snippetsForSelectedNode.length === 0" class="subdued">No results</p>
      <div v-else class="snippets">
        <div class="snippet" v-for="(snippet, i) in snippetsForSelectedNode" :key="i">
          <span class="open-quote">"</span>
          <div class="snippet-body">
            <p><span v-html="snippet.text" /></p>
            <div class="bottom-row">
              <div class="metadata">
                <p>{{ snippet.documentTitle }}</p>
                <p>{{ snippet.documentAuthor }}, {{ snippet.documentSource }}</p>
              </div>
              <button
                class="btn btn-sm"
                @click="
                  () => {
                    prepareHighlightsForDocumentViewer(i);
                    expandedDocumentId = snippet.documentId;
                    fragmentParagraphLocation = snippet.fragmentParagraphLocation;
                    textFragment = snippet.text;
                  }
                "
              >
                View in context
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
  <modal-document
    v-if="!!expandedDocumentId"
    :disable-edit="true"
    :document-id="expandedDocumentId"
    :fragment-paragraph-location="fragmentParagraphLocation"
    :text-fragment-raw="textFragment"
    :retrieve-document-meta="getDocument"
    :retrieve-document="getDocumentParagraphs"
    :content-handler="handleReturnedData"
    :use-scrolling="true"
    :highlights-for-selected="highlightsForSelected"
    @close="expandedDocumentId = null"
  />
</template>

<script setup lang="ts">
import {
  searchParagraphs,
  getDocument,
  getDocumentParagraphs,
  getHighlights,
} from '@/services/paragraphs-service';
import {
  Snippet,
  ParagraphSearchResponse,
  Document,
  DojoParagraphHighlights,
  DojoParagraphHighlight,
  ScrollData,
} from '@/types/IndexDocuments';
import { toRefs, watch, ref } from 'vue';
import ModalDocument from '@/components/modals/modal-document.vue';

const props = defineProps<{
  selectedNodeName: string;
  selectedUpstreamNodeName?: string | null;
}>();
const { selectedNodeName, selectedUpstreamNodeName } = toRefs(props);
const expandedDocumentId = ref<string | null>(null);
const fragmentParagraphLocation = ref<number>(1);
const textFragment = ref<string | null>(null);
const SNIPPETS_LOADING = 'Loading snippets...';
const NO_TITLE = 'Title not available';
const NO_AUTHOR = 'Author not available';
const NO_SOURCE = 'Source not available';
const NO_TEXT = 'Text not available';

// `null` means snippets are loading
const snippetsForSelectedNode = ref<Snippet[] | null>(null);
const highlightsForSelected = ref<DojoParagraphHighlight[]>([]);
const allHighlights = ref<DojoParagraphHighlights | null>(null);
const handleReturnedData = (data: ScrollData, previousContent: string | null) => {
  const content: string = previousContent || '';
  return content.concat(
    data?.paragraphs?.reduce((bodyText: string, p: any) => `${bodyText}<p>${p.text}</p>`, '')
  );
};

/**
 * Grab set of highlights and verify the highlights are unique and sorted by length
 * to ensure highlights are applied correctly.
 *
 * @param index
 */
const prepareHighlightsForDocumentViewer = (index: number) => {
  if (allHighlights.value !== null) {
    const workingValue: any[] = allHighlights.value.highlights[index];

    highlightsForSelected.value = workingValue
      .filter((item) => item.highlight === true)
      .reduce((accumulator, item) => {
        const index = accumulator.findIndex((e: any) => {
          return e.text === item.text;
        });
        if (index < 0) {
          return [...accumulator, item];
        }
        return accumulator;
      }, [])
      .sort((a: any, b: any) => {
        if (a.text.length > b.text.length) {
          return 1;
        } else if (a.text.length < b.text.length) {
          return -1;
        } else {
          return 0;
        }
      });
  } else {
    highlightsForSelected.value = [];
  }
};

watch(
  [selectedNodeName, selectedUpstreamNodeName],
  async () => {
    // Clear any previously-fetched snippets
    snippetsForSelectedNode.value = null;
    highlightsForSelected.value = [];
    allHighlights.value = null;

    // Save a copy of the node name to watch for race conditions later
    const fetchingSnippetsFor = selectedNodeName.value;

    // ensure search string includes source and target name data.
    const searchString =
      props.selectedUpstreamNodeName != null
        ? `${props.selectedNodeName} and ${props.selectedUpstreamNodeName}`
        : props.selectedNodeName;

    const queryResults: ParagraphSearchResponse = await searchParagraphs(searchString);
    if (fetchingSnippetsFor !== selectedNodeName.value) {
      // SelectedNodeName has changed since the results returned, so throw away the results to avoid
      //  a race condition.
      return;
    }

    // Fetch metadata for each document in parallel (too slow if performed one-by-one).
    const metadataRequests: Promise<Document>[] = queryResults.results.map((result) =>
      getDocument(result.document_id)
    );
    const metadataResults = await Promise.all(metadataRequests);

    allHighlights.value = await getHighlights({
      query: searchString,
      matches: queryResults.results.map((item) => item.text),
    });

    // Form list of snippets by pulling out relevant fields from query results and document data.
    snippetsForSelectedNode.value = queryResults.results.map((result, i) => {
      const metadata = metadataResults[i];
      return {
        documentId: result.document_id,
        fragmentParagraphLocation: parseInt(result.id.split('-')[1]),
        text: allHighlights.value
          ? allHighlights.value.highlights[i].reduce(
              (paragraph, item) =>
                item.highlight
                  ? `${paragraph}<span class="dojo-mark">${item.text}</span>`
                  : `${paragraph}${item.text}`,
              ''
            )
          : result.text
          ? result.text
          : NO_TEXT,
        documentTitle: metadata.title ?? NO_TITLE,
        documentAuthor: metadata.author ?? NO_AUTHOR,
        documentSource: metadata.producer ?? NO_SOURCE,
      };
    });
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
@import '@/styles/variables';
@import '@/styles/uncharted-design-tokens';

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
    :deep(.dojo-mark) {
      color: $accent-medium;
      background-color: $accent-lightest;
      border: 1px solid $accent-light;
      padding: 0 2px;
    }
  }
}
</style>
