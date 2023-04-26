<template>
  <!-- Note with teleport, Vite's HMR doesn't work. As a work around, try commenting out the teleport usage temporally-->
  <teleport to="#navbar-trailing-teleport-destination">
    <analysis-options-button v-if="analysisName" :analysis-id="analysisId" />
  </teleport>
  <div class="index-structure-view-container content-full flex-col">
    <IndexActionBar @add-concept="addConcept" />
    <div class="flex flex-grow h-0">
      <IndexTreePane
        v-if="isStateLoaded"
        class="flex-grow w-0"
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
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import AnalysisOptionsButton from '@/components/analysis-options-button.vue';
import IndexActionBar from '@/components/index-structure/index-action-bar.vue';
import IndexDrilldownPanel from '@/components/index-structure/index-drilldown-panel.vue';
import IndexTreePane from '@/components/index-structure/index-tree-pane.vue';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import { createNewConceptNode, isEdge } from '@/utils/index-tree-util';
import { SelectableIndexElementId } from '@/types/Index';
import useIndexTree from '@/services/composables/useIndexTree';

const store = useStore();
const route = useRoute();

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
</script>

<style lang="scss" scoped>
@import '@/styles/variables';

.index-structure-view-container {
  .index-drilldown-panel {
    width: 400px;
  }
}
</style>
