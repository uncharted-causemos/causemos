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
        :selected-element-id="selectedElementId"
      />
      <IndexDrilldownPanel class="index-drilldown-panel" :selected-element-id="selectedElementId" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import AnalysisOptionsButton from '@/components/analysis-options-button.vue';
import IndexActionBar, { DropdownOptions } from '@/components/index-structure/index-action-bar.vue';
import IndexDrilldownPanel from '@/components/index-structure/index-drilldown-panel.vue';
import IndexTreePane from '@/components/index-structure/index-tree-pane.vue';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import { createNewIndex } from '@/utils/indextree-util';

// If a node is selected, this is the node's ID
// If an edge is selected, this contains the IDs of the edge's source and target nodes.
export type SelectableElementId = string | { sourceId: string; targetId: string };

const store = useStore();
const route = useRoute();

const analysisId = computed(() => route.params.analysisId as string);
const { analysisName, refresh } = useIndexAnalysis(analysisId);

const indexWorkBench = useIndexWorkBench();

const isStateLoaded = ref(false);

const selectedElementId = ref<SelectableElementId | null>(null);
const selectElement = (id: SelectableElementId) => {
  selectedElementId.value = id;
};
const deselectAllElements = () => {
  selectedElementId.value = null;
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
      // Not yet implemented
      break;
    case DropdownOptions.Index:
      indexWorkBench.addItem(createNewIndex());
      break;
    default:
      break;
  }
};
</script>

<style lang="scss" scoped>
@import '~styles/variables';

.index-structure-view-container {
  .index-drilldown-panel {
    width: 400px;
  }
}
</style>
