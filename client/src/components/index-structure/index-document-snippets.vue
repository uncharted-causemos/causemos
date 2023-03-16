<template>
  <div class="index-document-snippets-container">
    <header>
      <h4>Document snippets</h4>
      <p class="subtitle">Extracted from {{ documentCount }} documents.</p>
    </header>
    <section>
      <h5>
        Snippets related to <strong>{{ props.selectedNodeName }}</strong>
      </h5>
      <div class="snippets">
        <div class="snippet" v-for="(snippet, i) in snippetsForSelectedNode" :key="i">
          <span class="open-quote">"</span>
          <div class="snippet-body">
            <p>{{ snippet.text }}</p>
            <div class="bottom-row">
              <div class="metadata">
                <p>{{ snippet.documentTitle }}</p>
                <p>{{ snippet.documentAuthor }}, {{ snippet.documentSource }}</p>
              </div>
              <!-- TODO: open document -->
              <button class="btn btn-sm" disabled>View in context</button>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section>
      <h5>Snippets related to components</h5>
      <div class="snippets">
        <div class="snippet" v-for="(snippet, i) in snippetsForComponents" :key="i">
          <span class="open-quote">"</span>
          <div class="snippet-body">
            <p>{{ snippet.text }}</p>
            <div class="bottom-row">
              <div class="metadata">
                <p>{{ snippet.documentTitle }}</p>
                <p>{{ snippet.documentAuthor }}, {{ snippet.documentSource }}</p>
              </div>
              <!-- TODO: open document -->
              <button class="btn btn-sm" disabled>View in context</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { searchParagraphs, getDocument } from '@/services/paragraphs-service';
interface Snippet {
  documentId: string;
  text: string;
  documentTitle: string;
  documentAuthor: string;
  documentSource: string;
}

// TODO: remove when we have real data
const MOCK_SNIPPET: Snippet = {
  documentId: 'id',
  text: 'lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec accumsan tellus eget nisl feugiat, Overall priority a luctus arcu viverra. Nunc blandit mollis libero, ac dictum diam cursus',
  documentTitle: 'Document title',
  documentAuthor: 'Document author',
  documentSource: 'Document source',
};

const props = defineProps<{
  selectedNodeName: string;
  // componentNames: string[];
}>();

let documentCount = 0;
const NO_TITLE = 'Title not available';
const NO_AUTHOR = 'Author not available';

// TODO: bold the name of the selected node and its components when they're found in the snippets
const snippetsForSelectedNode: Snippet[] = [];
const queryResults = await searchParagraphs(props.selectedNodeName);
const docIdsToFind: string[] = [];
if (queryResults) {
  const qrJSON = JSON.parse(queryResults); // todo: this shouldn't have to be done...(should return JSON)
  // const qrJSON = queryResults;
  documentCount = qrJSON.hits;
  qrJSON.results?.forEach(async (result: any) => {
    docIdsToFind.push(result.document_id);
    const aSnippet: Snippet = {
      documentId: result.document_id,
      text: result.text,
      documentTitle: NO_TITLE,
      documentAuthor: NO_AUTHOR,
      documentSource: result.Source,
    };
    snippetsForSelectedNode.push(aSnippet);
  });

  const docRequests: Promise<any>[] = []; // blast these requests in parallel (to slow if one-by-one)
  docIdsToFind.forEach((anId) => docRequests.push(getDocument(anId)));

  if (docRequests.length > 0) {
    const docMetadata = await Promise.all(docRequests);

    snippetsForSelectedNode.forEach((aSnippet) => {
      const meta = docMetadata.find((m) => aSnippet.documentId === m.id);
      if (meta) {
        aSnippet.documentTitle = meta.doc_title ? meta.doc_title : NO_TITLE;
        aSnippet.documentAuthor = meta.author ? meta.author : NO_AUTHOR;
      }
    });
  }
}

const snippetsForComponents: Snippet[] = [MOCK_SNIPPET, MOCK_SNIPPET];
</script>

<style lang="scss" scoped>
@import '~styles/uncharted-design-tokens';
.index-document-snippets-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

header {
  display: flex;
  flex-direction: column;
}

.subtitle {
  color: $un-color-black-40;
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
</style>
