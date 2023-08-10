<template>
  <div class="index-document-snippets-container">
    <header>
      <h4>Document snippets</h4>
    </header>
    <section>
      <p class="subdued" v-if="selectedUpstreamNodeName != null">
        related to <strong>{{ props.selectedNodeName }}</strong> and
        <strong>{{ props.selectedUpstreamNodeName }}</strong>
      </p>
      <p class="subdued" v-else>
        related to <strong>{{ props.selectedNodeName }}</strong>
      </p>
      <div class="geoContext subdued">
        <button
          v-if="!editGeoContext && geoContextString.length === 0"
          class="btn btn-sm btn-default"
          @click="toggleGeoContext"
        >
          <i class="fa fa-globe" />&nbsp;Add geographic context
        </button>
        <div class="showGeoContext" v-if="!editGeoContext && geoContextString.length > 0">
          <p class="subdued">in {{ geoContextString }}</p>
          <button class="btn btn-sm btn-default" @click="toggleGeoContext">
            Edit geographic context
          </button>
        </div>
        <div v-if="editGeoContext" class="geo-context-editor">
          <div class="geo-context-input">
            <p class="subdued">in</p>
            <input v-focus class="form-control" v-model="geoContextStringLive" />
          </div>
          <div class="geo-context-controls">
            <button class="btn btn-sm btn-default" @click="clearGeoContextString">Clear</button>
            <button class="btn btn-sm btn-primary" @click="doneSettingGeoContext">Done</button>
          </div>
        </div>
      </div>

      <div v-if="isLoadingSnippets" class="loading-indicator">
        <i class="fa fa-spin fa-spinner pane-loading-icon" />
        <p>{{ SNIPPETS_LOADING }}</p>
      </div>
      <p v-else-if="snippets.length === 0" class="subdued">No results</p>
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
import { getDocument, getDocumentParagraphs } from '@/services/paragraphs-service';
import { DojoParagraphHighlight, ScrollData } from '@/types/IndexDocuments';
import { toRefs, computed, ref, onMounted } from 'vue';
import ModalDocument from '@/components/modals/modal-document.vue';
import useParagraphSearchResults from '@/services/composables/useParagraphSearchResults';

const props = defineProps<{
  selectedNodeName: string;
  selectedUpstreamNodeName: string | null;
  geoContextString: string;
}>();

const emit = defineEmits<{
  (e: 'save-geo-context', value: string): void;
}>();

const { selectedNodeName, selectedUpstreamNodeName } = toRefs(props);
const expandedDocumentId = ref<string | null>(null);
const fragmentParagraphLocation = ref<number>(1);
const textFragment = ref<string | null>(null);
const SNIPPETS_LOADING = 'Loading snippets...';

const highlightsForSelected = ref<DojoParagraphHighlight[]>([]);
const editGeoContext = ref<boolean>(false);
const geoContextStringLive = ref<string>(''); // changes during editing (too many events)

onMounted(() => {
  geoContextStringLive.value = props.geoContextString;
});
const clearGeoContextString = () => {
  geoContextStringLive.value = '';
  emit('save-geo-context', geoContextStringLive.value);
  toggleGeoContext();
};
const toggleGeoContext = () => {
  editGeoContext.value = !editGeoContext.value;
};
const doneSettingGeoContext = () => {
  toggleGeoContext();
  emit('save-geo-context', geoContextStringLive.value);
};

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
  if (highlights.value !== null) {
    const workingValue: any[] = highlights.value.highlights[index];

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

const searchString = computed(() => {
  let result =
    selectedUpstreamNodeName.value != null
      ? `${selectedNodeName.value} and ${selectedUpstreamNodeName.value}`
      : selectedNodeName.value;
  if (props.geoContextString.length > 0) {
    result = `${result} in ${props.geoContextString}`;
  }
  return result;
});

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

.geoContext {
  margin-bottom: 10px;

  .geo-context-input {
    display: flex;
    flex-direction: row;
    margin: 5px 0;

    input {
      margin-left: 5px;
      width: 100%;
      height: 1.6em;
      background-color: white;
    }
  }
  .showGeoContext {
    display: flex;
    flex-direction: row;
    gap: 8px;
    p {
      padding: 4px 0;
      width: 100%;
    }
  }

  .geo-context-controls {
    display: flex;
    flex-direction: row;
    align-items: end;
    justify-content: end;
    column-gap: 5px;
    button.btn-primary {
      background-color: $accent-main;
    }
  }
}

.index-document-snippets-container {
  display: flex;
  flex-direction: column;
  gap: 2px;
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
