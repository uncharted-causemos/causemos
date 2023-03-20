<template>
  <DataExplorer
    :nav-back-label="navBackLabel"
    :select-button-label="selectButtonLabel"
    :enable-multiple-selection="false"
    @close="navigateBackToIndexStructure"
    @selection="handleSelection"
  />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';

import { Datacube } from '@/types/Datacube';
import { DatasetSearchResult } from '@/types/Index';

import router from '@/router';

import DataExplorer from '../components/data-explorer/data-explorer.vue';

import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';

import { getOutput } from '@/utils/datacube-util';
import { capitalizeEachWord } from '@/utils/string-util';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';

const navBackLabel = 'Back';
const selectButtonLabel = 'Add Dataset';

const route = useRoute();
const store = useStore();

// Load and initialize the index analysis state for given analysis id
const { waitForStateInSync, refresh } = useIndexAnalysis(
  computed(() => route.params.analysisId as string)
);
onMounted(async () => await refresh());

const workBench = useIndexWorkBench();
const indexTree = useIndexTree();

const enableOverlay = () => store.dispatch('app/enableOverlay');
const disableOverlay = () => store.dispatch('app/disableOverlay');

const convertDatacubeToDatasetSearchResult = (
  datacube: Datacube
): DatasetSearchResult | undefined => {
  const defaultOutput = getOutput(datacube, datacube.default_feature);
  if (!defaultOutput || !defaultOutput.name) return;
  const displayName = defaultOutput.display_name || capitalizeEachWord(defaultOutput.name);
  return {
    displayName,
    dataId: datacube.data_id,
    description: defaultOutput.description,
    familyName: datacube.family_name,
    outputName: defaultOutput.name,
  };
};

const navigateBackToIndexStructure = () => {
  router.replace({
    name: 'indexStructure',
    params: {
      projectType: route.params.projectType,
      project: route.params.project,
      analysisId: route.params.analysisId,
    },
  });
};

const handleSelection = async (selectedDatacubes: Datacube[]) => {
  if (!selectedDatacubes.length) return;
  const dataset = convertDatacubeToDatasetSearchResult(selectedDatacubes[0]);
  if (!dataset) return; // TODO: show error message;
  enableOverlay();
  await Promise.all([
    workBench.attachDatasetToPlaceholder(route.params.nodeId as string, dataset),
    indexTree.attachDatasetToPlaceholder(route.params.nodeId as string, dataset),
  ]);
  const isInSync = await waitForStateInSync();
  disableOverlay();
  if (isInSync) {
    navigateBackToIndexStructure();
  } else {
    // TODO: handle error toaster to display the failure message "Failed to add a dataset to index node"
  }
};
</script>

<style lang="scss" scoped></style>
