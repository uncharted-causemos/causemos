<template>
  <!-- Note with teleport, Vite's HMR doesn't work. As a work around, try commenting out the teleport usage temporally-->
  <teleport to="#navbar-trailing-teleport-destination">
    <analysis-options-button v-if="analysisName" :analysis-id="analysisId" />
  </teleport>
  <div class="index-structure-view-container content-full flex-col">
    <IndexActionBar @addDropdownChange="handleAddDropdownChange" />
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
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import AnalysisOptionsButton from '@/components/analysis-options-button.vue';
import IndexActionBar from '@/components/index-structure/index-action-bar.vue';
import { DropdownOptions } from '@/utils/index-common-util';
import IndexDrilldownPanel from '@/components/index-structure/index-drilldown-panel.vue';
import IndexTreePane from '@/components/index-structure/index-tree-pane.vue';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import { createNewIndex, createNewPlaceholderDataset } from '@/utils/index-tree-util';
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

// Set analysis name on the navbar
onMounted(async () => {
  store.dispatch('app/setAnalysisName', '');
  await refresh();
  store.dispatch('app/setAnalysisName', analysisName.value);
  isStateLoaded.value = true;
});

const handleAddDropdownChange = (option: DropdownOptions) => {
  switch (option) {
    case DropdownOptions.Dataset:
      indexWorkBench.addItem(createNewPlaceholderDataset());
      break;
    case DropdownOptions.Index:
      indexWorkBench.addItem(createNewIndex());
      break;
    default:
      break;
  }
};

const deleteEdge = (selectedElementIdToDelete: SelectableIndexElementId) => {
  if (typeof selectedElementIdToDelete === 'object') {
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
