<template>
  <teleport to="#navbar-trailing-teleport-destination">
    <analysis-options-button v-if="analysisName" :analysis-id="analysisId" />
  </teleport>
  <div class="index-structure-view-container content-full flex-col">
    <IndexActionBar @add-concept="addConcept" />
    <div class="flex flex-grow h-0" :class="[INSIGHT_CAPTURE_CLASS]">
      <IndexTreePane
        v-if="isStateLoaded"
        class="flex-grow w-0 index-tree-pane"
        @deselect-all="deselectAllElements"
        @select-element="selectElement"
        @highlight-edge="highlightEdge"
        @clear-highlight="clearHighlight"
        :selected-element-id="selectedElementId"
        :highlight-edge-id="highlightEdgeId"
      />
      <IndexDrilldownPanel
        class="index-drilldown-panel"
        :selected-element-id="selectedElementId"
        @delete-edge="deleteEdge"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import AnalysisOptionsButton from '@/components/analysis-options-button.vue';
import IndexActionBar from '@/components/index-structure/index-action-bar.vue';
import IndexDrilldownPanel from '@/components/index-structure/index-drilldown-panel.vue';
import IndexTreePane from '@/components/index-structure/index-tree-pane.vue';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import { createNewConceptNode, isEdge } from '@/utils/index-tree-util';
import { SelectableIndexElementId } from '@/types/Index';
import useIndexTree from '@/services/composables/useIndexTree';
import { INSIGHT_CAPTURE_CLASS, isIndexStructureDataState } from '@/utils/insight-util';
import { IndexStructureDataState, Insight } from '@/types/Insight';
import { getInsightById } from '@/services/insight-service';
import useToaster from '@/services/composables/useToaster';
import { TYPE } from 'vue-toastification';

const store = useStore();
const route = useRoute();
const router = useRouter();

const analysisId = computed(() => route.params.analysisId as string);
const { analysisName, refresh } = useIndexAnalysis(analysisId);

const indexWorkBench = useIndexWorkBench();
const indexTree = useIndexTree();

const isStateLoaded = ref(false);

const selectedElementId = ref<SelectableIndexElementId | null>(null);
const highlightEdgeId = ref<SelectableIndexElementId | null>(null);

const selectElement = (id: SelectableIndexElementId) => {
  deselectAllElements();
  selectedElementId.value = id;
};
const deselectAllElements = () => {
  selectedElementId.value = null;
  highlightEdgeId.value = null;
};

const highlightEdge = (id: SelectableIndexElementId) => {
  highlightEdgeId.value = id;
};

const clearHighlight = () => {
  highlightEdgeId.value = null;
};

const handleKey = (evt: KeyboardEvent) => {
  if (evt.key === 'Delete') {
    if (selectedElementId.value !== null && isEdge(selectedElementId.value)) {
      deleteEdge(selectedElementId.value);
    }
  }
};

onBeforeMount(() => {
  window.addEventListener('keyup', handleKey);
});
// Set analysis name on the navbar
onMounted(async () => {
  await store.dispatch('app/setAnalysisName', '');
  await refresh();
  await store.dispatch('app/setAnalysisName', analysisName.value);
  isStateLoaded.value = true;
});

onBeforeUnmount(() => {
  window.removeEventListener('keyup', handleKey);
});

const addConcept = () => {
  indexWorkBench.addItem(createNewConceptNode());
};

const deleteEdge = (selectedElementIdToDelete: SelectableIndexElementId) => {
  if (isEdge(selectedElementIdToDelete)) {
    indexTree.deleteEdge(selectedElementIdToDelete.sourceId) ||
      indexWorkBench.deleteEdge(selectedElementIdToDelete);
    deselectAllElements();
  }
};

const setContextId = (contextId: string) => {
  store.dispatch('insightPanel/setContextId', [contextId]);
};
onMounted(() => {
  setContextId(analysisId.value);
});

// Whenever state changes, sync it to insight panel store so that the latest state is captured when
//  taking an insight.
watch([selectedElementId], () => {
  const newDataState: IndexStructureDataState = {
    selectedElementId: selectedElementId.value,
  };
  store.dispatch('insightPanel/setDataState', newDataState);
  // No view state for this page. Set it to an empty object so that any view state from previous
  //  pages is cleared and not associated with insights taken from this page.
  store.dispatch('insightPanel/setViewState', {});
});

const doesSelectedElementExist = (id: SelectableIndexElementId) =>
  indexTree.containsElement(id) || indexWorkBench.containsElement(id);

const toaster = useToaster();
const updateStateFromInsight = async (insightId: string) => {
  const loadedInsight: Insight = await getInsightById(insightId);
  if (!loadedInsight) {
    toaster('Unable to apply the insight you selected.', TYPE.ERROR, false);
    return;
  }
  const dataState = loadedInsight.data_state;
  if (!dataState || !isIndexStructureDataState(dataState)) {
    toaster('Unable to apply the insight you selected.', TYPE.ERROR, false);
    return;
  }
  if (
    dataState.selectedElementId !== null &&
    !doesSelectedElementExist(dataState.selectedElementId)
  ) {
    toaster(
      'The element that is selected in this insight no longer exists in the analysis.',
      TYPE.ERROR,
      true
    );
    return;
  }
  selectedElementId.value = dataState.selectedElementId;
};

watch(
  [route],
  () => {
    const insight_id = route.query.insight_id as any;
    if (insight_id !== undefined) {
      updateStateFromInsight(insight_id);
      // Remove the insight_id from the url so that
      //  (1) future insight capture is valid
      //  (2) we can re-apply the same insight if necessary
      router
        .push({
          query: { insight_id: undefined },
        })
        .catch(() => {});
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.index-structure-view-container {
  .index-drilldown-panel {
    width: 400px;
  }
}

.index-tree-pane {
  // Duplicate background colour here so that insights include the background colour.
  background: $background-light-2;
}
</style>
