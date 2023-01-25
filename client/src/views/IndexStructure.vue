<template>
  <!-- Note with teleport, Vite's HMR doesn't work. As a work around, try commenting out the teleport usage temporally-->
  <!-- <teleport to="#navbar-trailing-teleport-destination">
    <analysis-options-button :analysis-id="analysisId" />
  </teleport> -->
  <div class="index-structure-view-container content-full flex">
    <div class="flex-col h-100 flex-grow w-0">
      <IndexActionBar @addDropdownChange="handleAddDropdownChange" />
      <IndexTreePane
        class="flex-grow"
        :index-analysis-id="analysisId"
        :index-tree="indexTree"
        :work-bench="tmpNodes"
      />
    </div>
    <IndexDrilldownPanel class="index-drilldown-panel" />
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
// import AnalysisOptionsButton from '@/components/analysis-options-button.vue';
import IndexActionBar, { DropdownOptions } from '@/components/index-structure/index-action-bar.vue';
import IndexDrilldownPanel from '@/components/index-structure/index-drilldown-panel.vue';
import IndexTreePane from '@/components/index-structure/index-tree-pane.vue';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import { IndexNode } from '@/types/Index';
import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import { createNewIndex } from '@/utils/indextree-util';

const store = useStore();
const route = useRoute();

const analysisId = computed(() => route.params.analysisId as string);
const {
  analysisName,
  // analysisState,
  indexTree,
  refresh,
} = useIndexAnalysis(analysisId);

const indexWorkBench = useIndexWorkBench();

// Temporary index nodes that are being created and not attached to the index tree yet
const tmpNodes = ref<IndexNode[]>([]);

// Set analysis name on the navbar
const analysisNameOnNavbar = computed(() => store.getters.analysisName);
const setAnalysisNameOnNavbar = async () => {
  // If analysis name on navbar and the name from analysis state doesn't match, refetch analysis state to sync up
  if (analysisNameOnNavbar.value !== analysisName.value) await refresh();
  store.dispatch('app/setAnalysisName', analysisName.value);
};
onMounted(setAnalysisNameOnNavbar);
watch([analysisName], setAnalysisNameOnNavbar);

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
    width: 30%;
    max-width: 767px;
  }
}
</style>
