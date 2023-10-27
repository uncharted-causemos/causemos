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
      <geographic-context
        :display-list-in-component="true"
        :geo-context-string="geoContextString"
        @save-geo-context="(context: string) => emit('save-geo-context', context)"
      />
      <div v-if="isLoadingSnippets" class="loading-indicator">
        <i class="fa fa-spin fa-spinner pane-loading-icon" />
        <p>Loading snippets...</p>
      </div>
      <p v-else-if="snippets !== null && snippets.length === 0" class="subdued">No results</p>
      <div v-else class="snippets">
        <div class="snippet" v-for="(snippet, i) in snippets" :key="i" ref="snippetRefs">
          <DocumentSnippetInsightControls
            class="document-snippet-insight-controls-container"
            :snippet-index="i"
            @click-save="saveInsight"
          />
          <span class="open-quote">"</span>
          <div class="snippet-body">
            <p class="snippet-content overflow-auto"><span v-html="snippet.text" /></p>
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
import { toRefs, computed, ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import html2canvas from 'html2canvas';
import ModalDocument from '@/components/modals/modal-document.vue';
import GeographicContext from '@/components/geographic-context.vue';
import DocumentSnippetInsightControls from '@/components/document-snippet-insight-controls.vue';
import useParagraphSearchResults from '@/composables/useParagraphSearchResults';
import useInsightStore from '@/composables/useInsightStore';
import { FullInsight } from '@/types/Insight';
import { Snippet } from '@/types/IndexDocuments';
import { INSIGHTS } from '@/utils/messages-util';
import { addInsight } from '@/services/insight-service';
import useToaster from '@/composables/useToaster';
import { TYPE } from 'vue-toastification';

const route = useRoute();
const toaster = useToaster();
const { getDataState, getViewState } = useInsightStore();

const props = defineProps<{
  selectedNodeName: string;
  selectedUpstreamNodeName: string | null;
  geoContextString: string;
}>();

const emit = defineEmits<{
  (e: 'save-geo-context', value: string): void;
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

const geoContextStringLive = ref<string>(''); // changes during editing (too many events)

onMounted(() => {
  geoContextStringLive.value = props.geoContextString;
});

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
  results,
  isLoading: isLoadingSnippets,
  highlights,
} = useParagraphSearchResults(searchString, 10);

const snippets = ref<(Snippet & { hasInsight: boolean })[]>([]);
watch([results], () => {
  snippets.value = (results?.value || []).map((val) => ({ ...val, hasInsight: false }));
});

// Snippet Insight controls
const snippetRefs = ref([]);
const saveInsight = async (snippetIndex: number) => {
  // Create an image of the snippet
  const imgScale = 1.5;
  const contentElementSelector = '.snippet-content';
  const ref: HTMLElement = snippetRefs.value[snippetIndex];
  const snippetBodyEl = ref.querySelector<HTMLElement>(contentElementSelector);
  const image = !snippetBodyEl
    ? ''
    : (await html2canvas(snippetBodyEl, { scale: imgScale })).toDataURL();

  // Construct insight name from snippet metadata
  const { documentTitle, fragmentParagraphLocation } = snippets?.value?.[snippetIndex] || {};
  const insightName = `${fragmentParagraphLocation}-${documentTitle}`;

  // Save new insight
  const newInsight: FullInsight = {
    name: insightName,
    description: '',
    visibility: 'private',
    project_id: route.params.project as string,
    context_id: [route.params.analysisId as string],
    url: route.fullPath,
    target_view: [], // Is this property actually being used in the app?
    is_default: true,
    image,
    // Note: data_state is already set globally using setDataState from `useInsightStore` in `indexStructure.vue` page.
    // So the value is available at this moment. This document snippet shares same viewState from the index structure page.
    // TODO: we should consider avoiding setting the state globally using the insight store. This makes it difficult to understand where the value is set from and how it's being modified.
    // Instead of keeping insight store globally, we should scope insight creation to its own component and space and pass necessary data for creating insight as props to it when needed.
    // e.g. Pass states or necessary data as props to review-insight-modal.vue instead of passing them through global store.
    // This might require quite a bit of refactoring so further reviews and inspection might be needed.
    data_state: getDataState(),
    view_state: getViewState(),
    analytical_question: [],
  };
  try {
    await addInsight(newInsight);
    toaster(INSIGHTS.SUCCESSFUL_ADDITION, TYPE.SUCCESS, false);
  } catch (e) {
    toaster(INSIGHTS.ERRONEOUS_ADDITION, TYPE.ERROR, true);
  }
};
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
  position: relative;
  .open-quote {
    // FIXME: use IBM Plex Sans or another font with more distinct open quotations
    width: 2rem;
    font-size: 2.4rem;
    line-height: 2.8rem;
    color: $un-color-black-40;
  }
  &:hover .snippet-body {
    color: $accent-main;
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
.document-snippet-insight-controls-container {
  position: absolute;
  top: 0;
  right: 0;
  display: none;
}
.snippet:hover .document-snippet-insight-controls-container {
  display: block;
}
</style>
