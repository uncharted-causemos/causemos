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
interface Snippet {
  text: string;
  documentTitle: string;
  documentAuthor: string;
  documentSource: string;
}

// TODO: remove when we have real data
const MOCK_SNIPPET: Snippet = {
  text: 'lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec accumsan tellus eget nisl feugiat, Overall priority a luctus arcu viverra. Nunc blandit mollis libero, ac dictum diam cursus',
  documentTitle: 'Document title',
  documentAuthor: 'Document author',
  documentSource: 'Document source',
};

const props = defineProps<{
  selectedNodeName: string;
  componentNames: string[];
}>();

// TODO: use real document count
const documentCount = 811;

// TODO: use real snippets
// TODO: bold the name of the selected node and its components when they're found in the snippets
const snippetsForSelectedNode: Snippet[] = [MOCK_SNIPPET, MOCK_SNIPPET];
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
