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
import { useRoute } from 'vue-router';
import { TYPE } from 'vue-toastification';

import { Datacube } from '@/types/Datacube';
import { DatasetSearchResult } from '@/types/Index';

import router from '@/router';

import DataExplorer from '../components/data-explorer/data-explorer.vue';

import useIndexWorkBench from '@/services/composables/useIndexWorkBench';
import useIndexTree from '@/services/composables/useIndexTree';
import useIndexAnalysis from '@/services/composables/useIndexAnalysis';
import useToaster from '@/services/composables/useToaster';
import useOverlay from '@/services/composables/useOverlay';

import { getOutput } from '@/utils/datacube-util';
import { capitalizeEachWord } from '@/utils/string-util';

const navBackLabel = 'Back';
const selectButtonLabel = 'Add Dataset';

const route = useRoute();
const toaster = useToaster();
const overlay = useOverlay();

// Load and initialize the index analysis state for given analysis id
const { waitForStateInSync, refresh } = useIndexAnalysis(
  computed(() => route.params.analysisId as string)
);
onMounted(async () => await refresh());

const workBench = useIndexWorkBench();
const indexTree = useIndexTree();

const convertDatacubeToDatasetSearchResult = (datacube: Datacube): DatasetSearchResult | null => {
  const defaultOutput = getOutput(datacube, datacube.default_feature);
  if (!defaultOutput || !defaultOutput.name) return null;
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
  if (!dataset)
    return toaster('Selected dataset is invalid or is missing metadata', TYPE.ERROR, false);
  overlay.enable();
  try {
    await Promise.all([
      workBench.attachDatasetToPlaceholder(route.params.nodeId as string, dataset),
      indexTree.attachDatasetToPlaceholder(route.params.nodeId as string, dataset),
    ]);
    await waitForStateInSync();
  } catch (e) {
    toaster(
      'Unexpected error happened while adding the selected dataset to index node',
      TYPE.ERROR,
      false
    );
  }
  overlay.disable();
  navigateBackToIndexStructure();
};
</script>

<style lang="scss" scoped></style>
